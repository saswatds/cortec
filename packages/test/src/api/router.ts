import { type IAxios } from '@cortec/axios';
import { z } from '@cortec/config';
import type { IDynamicConfig } from '@cortec/dynamic-config';
import type { IRouter } from '@cortec/polka';
import { Response, route } from '@cortec/polka';
import { join } from 'path';

export const importantConfig = z.object({
  abc: z.string(),
});

export type ImportantConfig = z.infer<typeof importantConfig>;

const Root = route({
  modules: ['mongodb', 'redis'],
  schema: {},
  authentication(req) {
    return Promise.resolve('123');
  },

  ctx(req) {
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
  async onRequest(req, ctx) {
    const dc = this.require<IDynamicConfig<ImportantConfig>>('dynamic-config');
    const axios = this.require<IAxios>('axios');

    const res = await axios.service('echo').trace(ctx).get('/get');

    return Response.json({
      ac: req.body,
      session: ctx.session,
      message: 'Hello World! ' + dc.config.abc,
      resp: res.data,
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
