import http from 'node:http';
import util from 'node:util';

import type { IContext, IModule, IServerHandler, Sig } from '@cortec/types';
import type { IConfig } from 'config';

export interface IServerConfig {
  http: {
    port: number;
  };
}

export default class CortecServer implements IModule {
  name = 'server';
  private handler: string | http.RequestListener;
  private server: http.Server | undefined;

  constructor(handler: string | http.RequestListener) {
    this.handler = handler;
  }

  async load(ctx: IContext, sig: Sig) {
    const config = ctx.provide<IConfig>('config');
    const serverConfig = config?.get<IServerConfig>(this.name);

    let handler: http.RequestListener | undefined;
    if (typeof this.handler === 'string') {
      handler = ctx.provide<IServerHandler>(this.handler)?.handler();
      if (!handler) throw new Error(`Module ${this.handler} not found`);
    } else {
      handler = this.handler;
    }

    const server = http.createServer(handler);
    const port = serverConfig?.http.port ?? 8080;

    this.server = server;
    await util.promisify(server.listen.bind(this.server, port))();
    sig.scope(this.name, 'http').success('listening on port ' + port);
  }
  async dispose() {
    return this.server && util.promisify(this.server.close.bind(this.server))();
  }
}
