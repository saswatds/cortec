import type { IContext, Module } from '@cortec/types';
import * as sentry from '@sentry/node';
import type { IConfig } from 'config';

export default class CortecSentry implements Module {
  name = 'sentry';
  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const sentryConfig = config.get<sentry.NodeOptions>(this.name);

    sentry.init({
      ...sentryConfig,
      release: `${ctx.service.name}@${ctx.service.version}`,
    });
  }
  async dispose() {
    await sentry.close(3000);
  }
}
