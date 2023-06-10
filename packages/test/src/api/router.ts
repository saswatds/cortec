import type { IRouter } from '@cortec/polka';
import { route } from '@cortec/polka';
import { join } from 'path';

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
      headers: {
        'content-type': 'application/json',
      },
    });
  },
});

const noMatch = route({
  onRequest: function (req, ctx) {
    return Promise.resolve({
      status: 501,
      body: 'Route not implemented',
      headers: {
        'content-type': 'text/html',
      },
    });
  },
});

export const Router: IRouter = (app) => {
  app.get('/test', Root);
  app.static('static', join(__dirname, 'static'));
  app.noMatch(noMatch);
};
