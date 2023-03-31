import '@total-typescript/ts-reset';

import type { IConfig } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import type { ISentry } from '@cortec/sentry';
import type { IContext, IModule } from '@cortec/types';
import bodyParser from 'body-parser';
import type { HelmetOptions } from 'helmet';
import helmet from 'helmet';
import type { ServerResponse } from 'http';
import polka from 'polka';
import { fromZodError } from 'zod-validation-error';

import type { HttpRoute, IRequestContextBuilder } from './HttpRoute';
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

interface Request extends polka.Request {
  body: unknown;
}

export default class Polka<T extends { [name: string]: unknown } = never>
  implements IModule
{
  name = 'polka';
  app: polka.Polka | undefined;
  private rcb: IRequestContextBuilder<T> | undefined;

  constructor(builder: IRequestContextBuilder<T> | undefined) {
    this.rcb = builder;
  }

  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const nr = ctx.provide<INewrelic>('newrelic');
    const sentry = ctx.provide<ISentry>('sentry');
    const polkaConfig = config?.get<PolkaConfig>(this.name);
    const rcb = this.rcb;

    const app = polka({
      onError(err, _req, res) {
        // Regardless of what the error is we can notify newrelic of the error
        // Note: newrelic auto-instruments the http module, so any 4xx and 5xx will appear twice in your error dashboard
        nr?.api.noticeError(err);

        // The error could be a handled error or unhandled error
        // Handled errors are going to be instance of the ResponseError class
        if (err instanceof ResponseError) return err.send(res);

        // Now this is an unhandled exception
        sentry?.api.captureException(err);

        // Respond as internal server error
        send(res, HttpStatusCode.INTERNAL_SERVER_ERROR, {
          error: 'InternalServerError',
          message: 'Something went wrong on the server',
        });
      },

      // Handle the case when no matching route was found
      onNoMatch(_req, res) {
        send(
          res,
          HttpStatusCode.NOT_IMPLEMENTED,
          'Route is not implemented by this service.'
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

        return (path: string, controller: HttpRoute<Request, unknown>) => {
          const METHOD = method.toUpperCase();
          /**
           * An enricher middleware that will set the transaction name for newrelic
           */
          const enricher = nr
            ? [
                (
                  _req: polka.Request,
                  _res: ServerResponse,
                  next: polka.Next
                ) => {
                  nr.api.setTransactionName(`${METHOD} ${path}`);
                  next();
                },
              ]
            : [];

          /**
           * Various body parsers for the route based on the route configuration
           */
          const parsers = controller.serde.map((type) =>
            bodyParser[type](polkaConfig?.bodyParser[type])
          );

          /**
           * Authentication middleware for the route based on the route configuration
           */
          const authentication = async (
            req: Request,
            _res: unknown,
            next: polka.Next
          ) => {
            try {
              await (nr
                ? nr.api.startSegment('authentication', true, () =>
                    controller.authentication(ctx, req)
                  )
                : controller.authentication(ctx, req));

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
              // TODO: Create the realtime class class for this request
              if (controller.schema) {
                try {
                  controller.schema.query?.parse(req.query);
                  controller.schema.params?.parse(req.params);
                  controller.schema.body?.parse(req.body);
                } catch (err: any) {
                  throw new ResponseError(
                    HttpStatusCode.BAD_REQUEST,
                    fromZodError(err).toString(),
                    {}
                  );
                }
              }

              const response = await (nr
                ? nr.api.startSegment('controller', true, () =>
                    controller.onRequest(rcb?.(req), req)
                  )
                : controller.onRequest(rcb?.(req), req));

              send(res, response.status, response.body);
            } catch (err: any) {
              next(err);
            }
          };

          (target as any)[method](
            path,
            ...enricher,
            ...parsers,
            authentication,
            handler
          );
        };
      },
    });
  }
  async dispose() {
    /**
     * Nothing to dispose
     */
  }
}
