import '@total-typescript/ts-reset';

import type http from 'node:http';

import type { IConfig } from '@cortec/config';
import type { ILogger } from '@cortec/logger';
import type { INewrelic } from '@cortec/newrelic';
import type { ISentry } from '@cortec/sentry';
import type {
  IApp,
  IContext,
  IModule,
  IRouter,
  IServerHandler,
  route,
} from '@cortec/types';
import bodyParser from 'body-parser';
import type { HelmetOptions } from 'helmet';
import helmet from 'helmet';
import type { ServerResponse } from 'http';
import type * as p from 'polka';
import polka from 'polka';
import type { TaskInnerAPI } from 'tasuku';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import HttpStatusCode from './HttpStatusCodes';
import ResponseError from './ResponseError';
import send from './send';

type PolkaConfig = {
  helmet: HelmetOptions;
  bodyParser: {
    json: bodyParser.OptionsJson;
    raw: bodyParser.Options;
    text: bodyParser.OptionsText;
    urlencoded: bodyParser.OptionsUrlencoded;
  };
};

const methods = [
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
  session: unknown;
  body: unknown;
}

export default class Polka implements IModule, IServerHandler {
  name = 'polka';
  app: polka.Polka | undefined;
  private router: IRouter;

  constructor(router: IRouter) {
    this.router = router;
  }

  async load(ctx: IContext, task: TaskInnerAPI) {
    const config = ctx.provide<IConfig>('config');
    const nr = ctx.provide<INewrelic>('newrelic');
    const sentry = ctx.provide<ISentry>('sentry');
    const logger = ctx.provide<ILogger>('logger');
    const polkaConfig = config?.get<PolkaConfig>(this.name);

    const app = polka({
      onError(err, _req, res) {
        // Regardless of what the error is we can notify newrelic of the error
        // Note: newrelic auto-instruments the http module, so any 4xx and 5xx will appear twice in your error dashboard
        nr?.api.noticeError(err);

        // The error could be a handled error or unhandled error
        // Handled errors are going to be instance of the ResponseError class
        if (err instanceof ResponseError) {
          // Handled errors are logged as warn as they are mostly harmless
          logger?.warn(err);
          return err.send(res);
        }

        // Unhandled exception are logger to sentry if it exists and logged as
        // error to the logger
        sentry?.api.captureException(err);
        logger?.error(err);

        // Respond as internal server error
        send(res, HttpStatusCode.INTERNAL_SERVER_ERROR, {
          error: 'InternalServerError',
          message: 'Something went wrong on the server',
        });
      },

      // Handle the case when no matching route was found
      onNoMatch(req, res) {
        send(
          res,
          HttpStatusCode.NOT_IMPLEMENTED,
          `route '${req.path}' is not implemented`
        );
      },
    });

    // Setup helmet for endpoint security
    app.use(helmet(polkaConfig?.helmet));

    // Setup the proxy for the app
    this.app = new Proxy(app, {
      get(target, method: string, receive) {
        if (!methods.includes(method))
          return Reflect.get(target, method, receive);

        return (path: string, controller: ReturnType<typeof route>) => {
          const missing = controller.modules?.filter((module) =>
            ctx.has(module)
          );
          if (missing?.length) {
            throw new Error(
              `The following modules are missing: ${missing.join(', ')}`
            );
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
            try {
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
                  throw new ResponseError(
                    HttpStatusCode.BAD_REQUEST,
                    fromZodError(err).toString(),
                    {}
                  );
                }
              }

              const reqCtx = {
                session: req.session,
                ...controller.ctx?.call(ctx, req),
              };

              const response = await (nr
                ? nr.api.startSegment('controller', true, () =>
                    controller.onRequest.call(ctx, req, reqCtx)
                  )
                : controller.onRequest.call(ctx, req, reqCtx));

              send(res, response.status, response.body);
            } catch (err: any) {
              next(err);
            }
          };

          task.task(`Route '${METHOD} ${path}'`, async () => {
            (target as any)[method](
              path,
              enricher,
              ...parsers,
              authentication,
              handler
            );
          });
        };
      },
    });

    // Register all the routes
    this.router(this.app as unknown as IApp, ctx);
    task.setTitle('Polka is ready');
  }
  async dispose() {
    /**
     * Nothing to dispose
     */
  }

  handler(): http.RequestListener | undefined {
    return this.app?.handler as http.RequestListener | undefined;
  }
}
