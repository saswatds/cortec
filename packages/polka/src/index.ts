import '@total-typescript/ts-reset';

import type http from 'node:http';

import type { IConfig } from '@cortec/config';
import type { ILogger } from '@cortec/logger';
import type { INewrelic } from '@cortec/newrelic';
import type { IRedis } from '@cortec/redis';
import type { ISentry } from '@cortec/sentry';
import type { IContext, IModule, IServerHandler, Sig } from '@cortec/types';
import bodyParser from 'body-parser';
import type { CompressionOptions } from 'compression';
import compression from 'compression';
import type { CorsOptions } from 'cors';
import cors from 'cors';
import type { HelmetOptions } from 'helmet';
import helmet from 'helmet';
import type { ServerResponse } from 'http';
import type * as p from 'polka';
import polka from 'polka';
import type { RateLimiterRes } from 'rate-limiter-flexible';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { ServeStaticOptions } from 'serve-static';
import serveStatic from 'serve-static';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import HttpStatusCode from './HttpStatusCodes';
import ResponseError from './ResponseError';
import send from './send';
import type { IApp, IRouter, route } from './types';

type PolkaConfig = {
  cors: CorsOptions;
  helmet: HelmetOptions;
  compression: CompressionOptions;
  bodyParser: {
    json: bodyParser.OptionsJson;
    raw: bodyParser.Options;
    text: bodyParser.OptionsText;
    urlencoded: bodyParser.OptionsUrlencoded;
  };
};

const methods = [
  'all',
  'get',
  'head',
  'patch',
  'options',
  'connect',
  'delete',
  'trace',
  'post',
  'put',
] as const;

interface Request extends p.Request {
  session?: unknown;
  body?: unknown;
  traceId?: string;
}

export default class Polka implements IModule, IServerHandler {
  name = 'polka';
  app: polka.Polka | undefined;
  private router: IRouter;
  private noMatchHandler:
    | undefined
    | ((req: p.Request, res: ServerResponse) => Promise<void>) = undefined;

  constructor(router: IRouter) {
    this.router = router;
  }

  async load(ctx: IContext, sig: Sig) {
    const config = ctx.provide<IConfig>('config');
    const nr = ctx.provide<INewrelic>('newrelic');
    const sentry = ctx.provide<ISentry>('sentry');
    const logger = ctx.provide<ILogger>('logger');
    const redis = ctx.provide<IRedis>('redis');
    const polkaConfig = config?.get<PolkaConfig>(this.name);

    const app = polka({
      onError: (err, req, res) => {
        const traceId = req.traceId || nanoid();
        err.traceId = traceId;

        // Regardless of what the error is we can notify newrelic of the error
        // Note: newrelic auto-instruments the http module, so any 4xx and 5xx will appear twice in your error dashboard
        nr?.api.noticeError(err);

        // The error could be a handled error or unhandled error
        // Handled errors are going to be instance of the ResponseError class
        if (err instanceof ResponseError) {
          // Handled errors are logged as warn as they are mostly harmless
          logger?.warn({ err, traceId });
          return err.send(res, { 'x-trace-id': traceId });
        }

        // Unhandled exception are logger to sentry if it exists and logged as
        // error to the logger
        sentry?.api.captureException(err);
        logger?.error({ err, traceId });

        // Respond as internal server error
        send(res, HttpStatusCode.INTERNAL_SERVER_ERROR, {
          error: 'InternalServerError',
          message: 'Something went wrong on the server',
          traceId,
        });
      },

      // Handle the case when no matching route was found
      onNoMatch: (req, res) => {
        const traceId = req.traceId || nanoid();

        // If no match handler has been defined, we will respond with a 501
        if (!this.noMatchHandler) {
          send(
            res,
            HttpStatusCode.NOT_IMPLEMENTED,
            `route '${req.path}' is not implemented`,
            { 'x-trace-id': traceId }
          );
          return;
        }

        // Otherwise we will call the no match handler
        this.noMatchHandler(req, res);
      },
    });

    // Attach a traceId to every request
    app.use((req, res, next) => {
      req.traceId = nanoid();
      next();
    });

    // Setup helmet for endpoint security
    app.use(helmet(polkaConfig?.helmet));

    // Setup cors for endpoint
    app.use(cors(polkaConfig?.cors));

    // Setup compression
    app.use(compression(polkaConfig?.compression));

    // Setup the proxy for the app
    this.app = new Proxy(app, {
      get: (target, method: string, receive) => {
        if (method === 'noMatch') {
          return (controller: ReturnType<typeof route>) => {
            this.noMatchHandler = async (req, res) => {
              const response = await controller.onRequest.call(ctx, req, {
                session: undefined,
              });

              send(res, response.status, response.body, response.headers);
            };
          };
        }

        if (method === 'static') {
          return (path: string, dir: string, options?: ServeStaticOptions) => {
            target.use(path, serveStatic(dir, options));
            sig.scope(this.name, 'static').info(`mounted /${path} -> ${dir}`);
          };
        }

        if (!methods.includes(method))
          return Reflect.get(target, method, receive);

        return (path: string, controller: ReturnType<typeof route>) => {
          const missing = controller.modules?.filter(
            (module) => !ctx.has(module)
          );
          let rateLimit: RateLimiterRedis | null = null;

          if (missing?.length) {
            throw new Error(
              `The following modules are missing: ${missing.join(', ')}`
            );
          }

          // Rate limiting
          if (controller.rateLimit) {
            const client = redis?.cache(controller.rateLimit.cache);
            if (!client) {
              throw new Error(
                `Cache '${controller.rateLimit.cache}' is not configured for rate limiting`
              );
            }

            rateLimit = new RateLimiterRedis({
              storeClient: client,
              duration: controller.rateLimit.duration,
              points: controller.rateLimit.limit,
              execEvenly: false,
              blockDuration: 0,
              keyPrefix:
                controller.rateLimit.keyPrefix ?? `rlflx:${path}:${method}`,
            });
          }

          const METHOD = method.toUpperCase();
          /**
           * An enricher middleware that will set the transaction name for newrelic
           */
          const enricher = (
            req: Request,
            _res: ServerResponse,
            next: polka.Next
          ) => {
            nr?.api.setTransactionName(`${METHOD} ${path}`);
            req.session = undefined;
            next();
          };

          /**
           * Various body parsers for the route based on the route configuration
           */
          const parsers =
            controller.serde?.map((type) =>
              bodyParser[type](polkaConfig?.bodyParser[type])
            ) ?? [];

          /**
           * Authentication middleware for the route based on the route configuration
           */
          const authentication = async (
            req: Request,
            _res: unknown,
            next: polka.Next
          ) => {
            const { authentication } = controller;
            if (!authentication) return next();

            try {
              const session = await (nr
                ? nr.api.startSegment('authentication', true, () =>
                  authentication.call(ctx, req)
                )
                : authentication.call(ctx, req));

              // Store the authentication result in the request store
              req.session = session;
              next();
            } catch (err: any) {
              next(err);
            }
          };

          /**
           * The actual handler for the route
           */
          const handler = async (
            req: Request,
            res: ServerResponse,
            next: polka.Next
          ) => {
            const reqCtx = {
              session: req.session,
              traceId: req.traceId,
              ...controller.ctx?.call(ctx, req),
            };

            try {
              if (rateLimit && controller.rateLimit) {
                await rateLimit
                  .consume(controller.rateLimit.count.call(ctx, req, reqCtx))
                  .catch((err: RateLimiterRes) => {
                    const traceId = req.traceId || nanoid();
                    throw new ResponseError(
                      HttpStatusCode.TOO_MANY_REQUESTS,
                      'Too many requests',
                      {
                        retryAfter: err.msBeforeNext / 1000 + 's',
                      }
                    );
                  });
              }

              if (controller.schema) {
                try {
                  z.object({
                    params: controller.schema.params ?? z.unknown(),
                    query: controller.schema.query ?? z.unknown(),
                    body: controller.schema.body ?? z.unknown(),
                  }).parse({
                    params: req.params,
                    query: req.query,
                    body: req.body,
                  });
                } catch (err: any) {
                  const traceId = req.traceId || nanoid();
                  throw new ResponseError(
                    HttpStatusCode.BAD_REQUEST,
                    fromZodError(err).toString(),
                    {}
                  );
                }
              }

              const response = await (nr
                ? nr.api.startSegment('controller', true, () =>
                  controller.onRequest.call(ctx, req, reqCtx)
                )
                : controller.onRequest.call(ctx, req, reqCtx));

              send(res, response.status, response.body, response.headers);
            } catch (err: any) {
              err.traceId = req.traceId;
              next(err);
            }
          };

          (target as any)[method](
            path,
            enricher,
            ...parsers,
            authentication,
            handler
          );
          sig
            .scope(this.name, 'endpoint')
            .info(`registered '${METHOD} ${path}'`);
        };
      },
    });

    // Register all the routes
    this.router(this.app as unknown as IApp, ctx);
  }
  async dispose() {
    /**
     * Nothing to dispose
     */
  }

  handler(): http.RequestListener | undefined {
    if (!this.app) throw new Error(`module ${this.name} is not loaded`);
    return this.app.handler as http.RequestListener;
  }
}

export { default as HttpStatusCode } from './HttpStatusCodes';
export { default as Response } from './Response';
export { default as ResponseError } from './ResponseError';
export * from './types';
