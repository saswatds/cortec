import type { IConfig } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import type { ISentry } from '@cortec/sentry';
import type { IContext, IModule } from '@cortec/types';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import type { ServerResponse } from 'http';
import polka from 'polka';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

import type { HttpRoute } from './HttpRoute';
import HttpStatusCode from './HttpStatusCodes';
import ResponseError from './ResponseError';
import send from './send';

export default class Polka implements IModule {
  name = 'polka';
  app: polka.Polka | undefined;

  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const nr = ctx.provide<INewrelic>('newrelic');
    const sentry = ctx.provide<ISentry>('sentry');
    const polkaConfig = config?.get<any>(this.name);

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

      onNoMatch(_req, res) {
        // No mathcing route was found
        send(
          res,
          HttpStatusCode.NOT_IMPLEMENTED,
          'Route is not implemented by this service.'
        );
      },
    });

    // Setup helmel for security
    app.use(helmet(polkaConfig.helmet));

    // Setup the proxy for the app
    this.app = new Proxy(app, {
      get(target, method: string, receive) {
        if (
          ![
            'get',
            'head',
            'patch',
            'options',
            'connect',
            'delete',
            'trace',
            'post',
            'put',
          ].includes(method)
        )
          return Reflect.get(target, method, receive);

        return (path: string, controller: HttpRoute<polka.Request>) => {
          const METHOD = method.toUpperCase();
          // The first middleware we inject is an enricher that annotates the transaction properly
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

          const bodyParsers = controller.serde.map((type) =>
            bodyParser[type](polkaConfig.bodyParser[type])
          );

          // Create all the middleware
          const authentication = (() => {
            const auth = controller.authentication;
            if (!auth) return [];

            return [
              (req: polka.Request, _res: unknown, next: polka.Next) =>
                auth(ctx, req)
                  .then(() => next())
                  .catch((err) => next(err)),
            ];
          })();

          const handler = async (
            req: polka.Request,
            res: ServerResponse,
            next: polka.Next
          ) => {
            try {
              // TODO: Create the realtime class class for this request
              if (controller.validation) {
                const result = z.object(controller.validation).safeParse(req);
                if (!result.success)
                  return next(
                    new ResponseError(
                      HttpStatusCode.BAD_REQUEST,
                      fromZodError(result.error).toString(),
                      {}
                    )
                  );
              }

              const response = await (nr
                ? nr.api.startSegment('controller', true, () =>
                    controller.onRequest(req)
                  )
                : controller.onRequest(req));

              send(res, response.status, response.body);
            } catch (err: any) {
              next(err);
            }
          };

          (target as any)[method](
            path,
            ...enricher,
            ...bodyParsers,
            ...authentication,
            handler
          );
        };
      },
    });
  }
  async dispose() {}
}
