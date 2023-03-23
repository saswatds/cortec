import type { Cb, Ctx, Exit } from '@cortes/types';
// eslint-disable-next-line import/default
import newrelic from 'newrelic';

export default function (ctx: Ctx, exit: Exit, done: Cb) {
  // Attach an uncaught exception handler
  process.once('uncaughtException', (exception) => {
    console.error(exception);
    newrelic.noticeError(exception);

    // Safely shutdown new relic and exit the process
    newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, () =>
      exit(1)
    );
  });

  // Attach an unhandled rejection handler
  process.once('unhandledRejection', (rejection: Error) => {
    console.error(rejection);
    newrelic.noticeError(rejection);

    // Safely shutdown new relic and exit the process
    newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, () =>
      exit(1)
    );
  });

  return done(undefined, (next) => {
    newrelic.shutdown({ collectPendingData: true, timeout: 3000 }, () =>
      next()
    );
  });
}
