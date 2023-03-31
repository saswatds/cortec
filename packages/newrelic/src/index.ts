import type { IModule } from '@cortec/types';
// eslint-disable-next-line import/default
import newrelic from 'newrelic';

export interface INewrelic {
  api: typeof newrelic;
}

export default class CortecNewrelic implements IModule, INewrelic {
  name = 'newrelic';
  api = newrelic;
  async load() {
    // Attach an uncaught exception handler
    process.on('uncaughtExceptionMonitor', (exception) => {
      console.error(exception);
      this.api.noticeError(exception);
    });

    // Attach an unhandled rejection handler
    process.on('unhandledRejection', (rejection: Error) => {
      console.error(rejection);
      this.api.noticeError(rejection);
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
