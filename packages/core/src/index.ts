/**
 * The core package provides the foundation for loading various dependencies
 */
import type { Disposer, Exit, IModule } from '@cortes/types';
import series from 'p-series';
import task from 'tasuku';
import { createInjector } from 'typed-inject';

export function load(modules: IModule[]): Promise<Exit> {
  // Create a dependency injector container
  const injector = createInjector();

  const disposers: Disposer[] = [];
  const onExit: Exit = (code: number) => {
    series(disposers).finally(() => process.exit(code));
  };

  return series(
    modules.map(
      (module, i) => () =>
        task(`Module ${module.name ?? i}`, () => module(injector, onExit))
    )
  ).then((tasks) => {
    tasks.forEach(({ result }) => disposers.push(result));
    return onExit;
  });
}
