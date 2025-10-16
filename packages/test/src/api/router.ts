import { type IAxios } from '@cortec/axios';
import { z } from '@cortec/config';
import type { IDynamicConfig } from '@cortec/dynamic-config';
import type { IRouter } from '@cortec/polka';
import { Response, route } from '@cortec/polka';
import type { IPostgres } from '@cortec/postgres';
import type { IRabbitMQ } from '@cortec/rabbitmq';
import { join } from 'path';

export const importantConfig = z.object({
  abc: z.string(),
});

export type ImportantConfig = z.infer<typeof importantConfig>;

const Root = route({
  modules: ['redis'],
  schema: {
    query: z.object({
      q: z.string().optional(),
    }),
  },
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
    const rabbitmq = this.require<IRabbitMQ>('rabbitmq');
    const postgres = this.require<IPostgres>('postgres');

    const res = await axios.service('echo').trace(ctx).get('/get');
    rabbitmq.channel('primary').sendToQueue('test', 'q: Hello World!');

    // Get a row from postgres

    const row = await postgres.db('test').query('SELECT * FROM test');

    return Response.json({
      ac: req.body,
      session: ctx.session,
      message: 'Hello World! ' + dc.config.abc,
      axios: res.data,
      postgres: row.rows,
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
