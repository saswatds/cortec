/* eslint-disable @typescript-eslint/member-ordering */
import type { IConfig } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import type { IContext, IModule } from '@cortec/types';
import flat from 'flat';
import type { LogFn, Logger } from 'pino';
import pino, { multistream } from 'pino';

export interface ILogger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
}

const MAX_LENGTH = 1021,
  OUTPUT_LENGTH = 1024,
  truncate = (str: string) => {
    if (str.length > OUTPUT_LENGTH) {
      return `${str.substring(0, MAX_LENGTH)}...`;
    }

    return str;
  };

type LoggerConfig = {
  level?: string;
};

export default class CortecLogger implements IModule, ILogger {
  name = 'logger';
  private logger: Logger = pino({ level: 'silent' });

  trace = this.logger.trace.bind(this.logger);
  debug = this.logger.debug.bind(this.logger);
  info = this.logger.info.bind(this.logger);
  warn = this.logger.warn.bind(this.logger);
  error = this.logger.error.bind(this.logger);
  fatal = this.logger.fatal.bind(this.logger);
  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const loggerConfig = config?.get<LoggerConfig>(this.name);
    const nr = config?.get<INewrelic>('newrelic');

    this.logger = pino(
      {
        mixin() {
          return nr?.api.getLinkingMetadata() ?? {};
        },
        formatters: {
          level: (level) => ({ level }),
        },
        hooks: {
          logMethod(args, method) {
            const [arg1, ...rest] = args as any;

            if (!(arg1 instanceof Error)) {
              return method.apply(this, args);
            }

            const arg: any = {};

            arg['error.class'] =
              arg1.name !== 'Error' ? arg1.constructor.name : arg1.name;
            arg['error.name'] = arg1.name;
            arg['error.message'] = truncate(arg1.message);
            arg['error.stack'] = arg1.stack;

            // If we have details then flatten send to error logs
            if ('details' in arg1) {
              Object.assign(arg, flat({ details: arg1.details }));
            }

            return method.apply(this, [arg, ...rest]);
          },
        },
        level: loggerConfig?.level ?? 'info',
      },
      multistream(
        [
          { level: 'debug', stream: process.stdout },
          { level: 'error', stream: process.stderr },
        ],
        {
          dedupe: true,
        }
      )
    );
  }
  async dispose() {
    /* No Op */
  }
}
