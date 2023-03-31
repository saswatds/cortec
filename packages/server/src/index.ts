import http from 'node:http';
import util from 'node:util';

import type { IContext, IModule, IServerHandler } from '@cortec/types';
import type { IConfig } from 'config';
import type { TaskInnerAPI } from 'tasuku';

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

  async load(ctx: IContext, task: TaskInnerAPI) {
    const config = ctx.provide<IConfig>('config');
    const serverConfig = config?.get<IServerConfig>(this.name);

    let handler: http.RequestListener | undefined;
    if (typeof this.handler === 'string') {
      handler = ctx.provide<IServerHandler>(this.handler)?.handler();
      if (!handler) throw new Error(`Module ${this.handler} not found`);
    } else {
      handler = this.handler;
    }

    this.server = http.createServer(handler);
    const port = serverConfig?.http.port ?? 8080;

    await util.promisify(this.server.listen.bind(this.server, port))();

    task.setTitle(`Server listening on port ${port}`);
  }
  async dispose() {
    return this.server && util.promisify(this.server.close.bind(this.server))();
  }
}
