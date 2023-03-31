import type { IRouter } from '@cortec/types';
import { route } from '@cortec/types';
import { z } from 'zod';

const Root = route({
  schema: {
    params: z.object({
      id: z.string(),
    }),
    query: z.object({}),
  },
  authentication: function (req) {
    return Promise.resolve();
  },
  onRequest: function (req, ctx) {
    return Promise.resolve({
      status: 200,
      body: {
        message: 'Hello World!',
      },
    });
  },
});

export const Router: IRouter = (app) => {
  app.get('/test', Root);
};
