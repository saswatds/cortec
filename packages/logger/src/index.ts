import type { IConfig } from '@cortec/config';
import type { IContext, IModule } from '@cortec/types';

export interface ILogger {
  silly(...args: unknown[]): void;
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(err: Error): void;
  fatal(err: Error): void;
}

export default class CortecLogger implements IModule, ILogger {
  name = 'logger';
  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const loggerConfig = config?.get<any>(this.name);

    // TODO: Remove this when we have a proper logger
    if (loggerConfig?.enabled === false) {
      return;
    }
  }
  async dispose() {
    /* No Op */
  }

  silly(...args: unknown[]): void {
    console.debug(...args);
  }
  trace(...args: unknown[]): void {
    console.trace(...args);
  }
  debug(...args: unknown[]): void {
    console.debug(...args);
  }
  info(...args: unknown[]): void {
    console.info(...args);
  }
  warn(...args: unknown[]): void {
    console.warn(...args);
  }
  error(...args: unknown[]): void {
    console.error(...args);
  }
  fatal(...args: unknown[]): void {
    console.error(...args);
  }
}
