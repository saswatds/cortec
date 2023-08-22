/**
 * The core package provides the foundation for loading various dependencies
 */
import Config from '@cortec/config';
import type { IContext, IModule, Service } from '@cortec/types';
import exit from 'exit';
import pEachSeries from 'p-each-series';
import { timeout as pTimeout, TimeoutError } from 'promise-timeout';
import { Signale } from 'signale';
import { dump } from 'wtfnode';

interface ICortecConfig extends Service {
  printOpenHandles?: boolean;
  silent?: boolean;
  loadTimeout?: number;
  disposeTimeout?: number;
}

class Cortec implements IContext {
  service: ICortecConfig;
  private modules: Map<string, IModule> = new Map();
  private logger: Signale;
  constructor(service: ICortecConfig) {
    this.service = service;
    this.logger = new Signale({
      disabled: service.silent,
    });
    this.logger.config({
      displayLabel: false,
    });

    // Load the default config module
    this.use(new Config());

    // Usually be generated with Ctrl+C
    process.on('SIGINT', () => this.dispose(0));
    // It is the normal way to politely ask a program to terminate.
    process.on('SIGTERM', () => this.dispose(0));

    // If an exception is not handled, kill the process
    process.on('uncaughtException', () => this.dispose(1));
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }

  provide<T = unknown>(name: string): T | undefined {
    return this.modules.get(name) as T | undefined;
  }

  require<T = unknown>(name: string): T {
    const module = this.provide<T>(name);
    if (!module) throw new Error('Module "' + name + '" not found');
    return module;
  }

  use(module: IModule) {
    this.modules.set(module.name, module);
  }

  dispose(code: number) {
    // Print to stderr that we are existing
    console.error('Exiting (%d)...', code);
    const logger = this.logger.scope('cortec');
    return pTimeout(
      pEachSeries([...this.modules].reverse(), ([_name, module]) => {
        logger.pending('disposing module "' + module.name + '"');
        return module.dispose();
      }),
      this.service.disposeTimeout ?? 5000
    )
      .catch((err) => {
        if (err instanceof TimeoutError) {
          logger.fatal('Module dispose timed out');
        } else {
          logger.fatal(err);
        }
      })
      .finally(() => {
        logger.success('Exit (code: ' + code + ')');
        this.service.printOpenHandles && dump();

        // A negative exit code will cause the process to not exit.
        // This is useful for testing purposes.
        code >= 0 && exit(code);
      });
  }
  async load() {
    const logger = this.logger.scope('cortec');
    return pEachSeries([...this.modules], async ([name, module]) => {
      logger.start('loading module "' + name + '"');
      await pTimeout(
        module.load(this, this.logger),
        this.service.loadTimeout ?? 60 * 1000
      );
    }).catch((err) => {
      if (err instanceof TimeoutError) {
        logger.fatal('Module load timed out');
      } else {
        logger.fatal(err);
      }
      // If any of the modules fail to load, exit the process
      this.dispose(1);
    });
  }
}

export default Cortec;
