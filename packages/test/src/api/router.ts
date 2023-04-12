import type { IRouter } from '@cortec/types';
import { route } from '@cortec/types';
import { z } from 'zod';

const Root = route({
  modules: ['mongodb', 'redis'],
  schema: {
    params: z.object({
      id: z.string(),
    }),
    query: z.object({}),
  },
  authentication: function (req) {
    return Promise.resolve('123');
  },

  ctx: function (req) {
    return {
      foo: 'bar',
    };
  },
  onRequest: function (req, ctx) {
    return Promise.resolve({
      status: 200,
      body: {
        ac: req.body,
        session: ctx.session,
        message: 'Hello World!',
      },
    });
  },
});

export const Router: IRouter = (app) => {
  app.get('/test', Root);
};
