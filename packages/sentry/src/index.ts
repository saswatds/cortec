import type { IContext, IModule } from '@cortec/types';
import * as sentry from '@sentry/node';
import type { IConfig } from 'config';

export interface ISentry {
  api: typeof sentry;
}

export default class CortecSentry implements IModule, ISentry {
  name = 'sentry';
  api = sentry;
  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const sentryConfig = config.get<sentry.NodeOptions>(this.name);

    this.api.init({
      ...sentryConfig,
      release: `${ctx.service.name}@${ctx.service.version}`,
    });
  }
  async dispose() {
    await this.api.close(3000);
  }
}
