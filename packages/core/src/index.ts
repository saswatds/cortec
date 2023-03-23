/**
 * The core package provides the foundation for loading various dependencies
 */
import series from 'p-series';
import task from 'tasuku';
import type { Injector } from 'typed-inject';
import { createInjector } from 'typed-inject';

export type IModule = (injector: Injector, exit: Exit) => Promise<Disposer>;
export type Exit = (code: number) => void;
export type ExitCallback = (exit: Exit) => void;
export type Disposer = () => Promise<void>;

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
