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

    console.log(loggerConfig);
  }
  async dispose() {
    /* No Op */
  }

  silly(...args: unknown[]): void {
    /* No Op */
  }
  trace(...args: unknown[]): void {
    /* No Op */
  }
  debug(...args: unknown[]): void {
    /* No Op */
  }
  info(...args: unknown[]): void {
    /* No Op */
  }
  warn(...args: unknown[]): void {
    /* No Op */
  }
  error(...args: unknown[]): void {
    /* No Op */
  }
  fatal(...args: unknown[]): void {
    /* No Op */
  }
}
