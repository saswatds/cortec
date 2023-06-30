/**
 * The core package provides the foundation for loading various dependencies
 */
import Config from '@cortec/config';
import type { IContext, IModule, Service } from '@cortec/types';
import pEachSeries from 'p-each-series';
import { Signale } from 'signale';

class Cortec implements IContext {
  service: Service;
  private modules: Map<string, IModule> = new Map();
  private signale: Signale;
  constructor(service: Service) {
    this.service = service;
    this.signale = new Signale({
      disabled: service.silent,
    });
    this.signale.config({
      displayLabel: false,
    });

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
    this.signale.await('Exiting (code: ' + code + ')');
    Promise.allSettled(
      [...this.modules].reverse().map(([_name, module]) => {
        this.signale.pending('disposing module "' + module.name + '"');
        return module.dispose();
      })
    ).finally(() => {
      process.exit(code);
    });
  }
  async load() {
    return pEachSeries([...this.modules], async ([name, module]) => {
      this.signale.scope('cortec').start('loading module "' + name + '"');
      await module.load(this, this.signale);
    });
  }
}

export default Cortec;
