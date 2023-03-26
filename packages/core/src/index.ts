/**
 * The core package provides the foundation for loading various dependencies
 */
import type { IContext, Module, Service } from '@cortec/types';
import pSeries from 'p-series';
import tasuku from 'tasuku';

class Cortec implements IContext {
  service: Service;
  private modules: Map<string, Module> = new Map();
  constructor(service: Service) {
    this.service = service;
  }
  provide<T = unknown>(name: string): T {
    return this.modules.get(name) as T;
  }
  use(module: Module) {
    this.modules.set(module.name, module);
  }
  dispose(code: number) {
    const modulesToDispose = [...this.modules].map(
      ([name, module]) =>
        () =>
          tasuku(`Dispose ${name}`, () => module.dispose())
    );

    pSeries(modulesToDispose).then(() => process.exit(code));
  }
  async load() {
    const modulesToLoad = [...this.modules]
      .filter(([_, module]) => !module.loaded)
      .map(
        ([name, module]) =>
          () =>
            tasuku(`Load ${name}`, () => module.load(this))
      );

    await pSeries(modulesToLoad);
  }
}

export default Cortec;
