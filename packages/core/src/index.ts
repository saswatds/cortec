/**
 * The core package provides the foundation for loading various dependencies
 */
import Config from '@cortec/config';
import type { IContext, Module, Service } from '@cortec/types';
import pEachSeries from 'p-each-series';
import tasuku from 'tasuku';

class Cortec implements IContext {
  service: Service;
  private modules: Map<string, Module> = new Map();
  constructor(service: Service) {
    this.service = service;

    // Load the default config module
    this.use(new Config());
  }
  provide<T = unknown>(name: string): T {
    return this.modules.get(name) as T;
  }
  use(module: Module) {
    this.modules.set(module.name, module);
  }
  dispose(code: number) {
    Promise.allSettled(
      [...this.modules].map(([name, module]) =>
        tasuku(`Disposing '${name}'`, () => module.dispose())
      )
    ).then(() => process.exit(code));
  }
  async load() {
    return pEachSeries([...this.modules], ([name, module]) =>
      tasuku(`Loading '${name}'`, () => module.load(this))
    );
  }
}

export default Cortec;
