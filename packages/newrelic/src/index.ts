import type { IContext, IModule } from '@cortec/types';
// eslint-disable-next-line import/default
import newrelic from 'newrelic';

export interface INewrelic {
  api: typeof newrelic;
}

export default class CortecNewrelic implements IModule, INewrelic {
  name = 'newrelic';
  api = newrelic;
  async load(ctx: IContext) {
    // Attach an uncaught exception handler
    process.once('uncaughtException', (exception) => {
      console.error(exception);
      this.api.noticeError(exception);
      ctx.dispose(1);
    });

    // Attach an unhandled rejection handler
    process.once('unhandledRejection', (rejection: Error) => {
      console.error(rejection);
      this.api.noticeError(rejection);
      ctx.dispose(1);
    });
  }
  async dispose() {
    return new Promise<void>((resolve, reject) => {
      this.api.shutdown({ collectPendingData: true, timeout: 3000 }, (err) =>
        err ? reject(err) : resolve()
      );
    });
  }
}
