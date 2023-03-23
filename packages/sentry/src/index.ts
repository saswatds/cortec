import type { Disposer } from '@cortes/types';
import * as sentry from '@sentry/node';
import type { IConfig } from 'config';
import type { Injector, TChildContext } from 'typed-inject';

export const id = 'sentry';
/**
 * The config package provides the ability to load configuration files
 * @param injector container for dependency injection
 * @param exit A function to call to exit the process
 */
export async function config(
  injector: Injector<
    TChildContext<
      TChildContext<unknown, { name: string; version: string }, 'app'>,
      IConfig,
      'config'
    >
  >
): Promise<Disposer> {
  const config = injector.resolve('config');
  const pkg = injector.resolve('app');
  const sentryConfig = config.util.toObject(config.get(id));

  sentry.init({
    ...sentryConfig,
    release: `${pkg.name}@${pkg.version}`,
  });

  // When disposing, wait for 3 seconds for the Sentry client to flush
  return async () => sentry.close(3000);
}
