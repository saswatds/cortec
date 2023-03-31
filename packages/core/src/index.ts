/**
 * The core package provides the foundation for loading various dependencies
 */
import Config from '@cortec/config';
import type { IContext, IModule, Service } from '@cortec/types';
import pEachSeries from 'p-each-series';
import tasuku from 'tasuku';

class Cortec implements IContext {
  service: Service;
  private modules: Map<string, IModule> = new Map();
  constructor(service: Service) {
    this.service = service;

    // Load the default config module
    this.use(new Config());

    // Attach all the process events
    process.on('SIGINT', () => this.dispose(0));
    process.on('SIGTERM', () => this.dispose(0));
    process.on('uncaughtException', () => this.dispose(1));
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }
  provide<T = unknown>(name: string): T {
    return this.modules.get(name) as T;
  }
  use(module: IModule) {
    this.modules.set(module.name, module);
  }
  dispose(code: number) {
    tasuku(`Exiting...`, () =>
      Promise.allSettled(
        [...this.modules].map(([_name, module]) => module.dispose())
      )
    ).finally(() => {
      process.exit(code);
    });
  }
  async load() {
    return pEachSeries([...this.modules], ([name, module]) =>
      tasuku(`Load module '${name}'`, (api) => module.load(this, api))
    );
  }
}

export default Cortec;
