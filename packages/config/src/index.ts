import type { Disposer } from '@cortes/types';
import c from 'config';
import type { Injector } from 'typed-inject';

export const id = 'config';
/**
 * The config package provides the ability to load configuration files
 * @param injector container for dependency injection
 * @param exit A function to call to exit the process
 */
export async function config(injector: Injector): Promise<Disposer> {
  injector.provideValue(id, c);
  return async () => {
    /* No op */
  };
}
