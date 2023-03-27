import type { IContext, Module } from '@cortec/types';
// eslint-disable-next-line import/default
import newrelic from 'newrelic';

export default class CortecNewrelic implements Module {
  name = 'newrelic';
  nr = newrelic;
  async load(ctx: IContext) {
    // Attach an uncaught exception handler
    process.once('uncaughtException', (exception) => {
      console.error(exception);
      this.nr.noticeError(exception);
      ctx.dispose(1);
    });

    // Attach an unhandled rejection handler
    process.once('unhandledRejection', (rejection: Error) => {
      console.error(rejection);
      this.nr.noticeError(rejection);
      ctx.dispose(1);
    });
  }
  async dispose() {
    return new Promise<void>((resolve, reject) => {
      this.nr.shutdown({ collectPendingData: true, timeout: 3000 }, (err) =>
        err ? reject(err) : resolve()
      );
    });
  }
}
