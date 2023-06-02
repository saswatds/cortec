import type { IRouter } from '@cortec/types';
import { route } from '@cortec/types';

const Root = route({
  modules: ['mongodb', 'redis'],
  schema: {},
  authentication: function (req) {
    return Promise.resolve('123');
  },

  ctx: function (req) {
    return {
      foo: 'bar',
    };
  },
  rateLimit: {
    cache: 'test',
    limit: 1,
    duration: 10,
    count() {
      return '1';
    },
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

const noMatch = route({
  onRequest: function (req, ctx) {
    return Promise.resolve({
      status: 501,
      body: 'Route not implemented',
    });
  },
});

export const Router: IRouter = (app) => {
  app.get('/test', Root);
  app.noMatch(noMatch);
};
