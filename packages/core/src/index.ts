/**
 * The core package provides the foundation for loading various dependencies
 */
import Config from '@cortec/config';
import type { IContext, IModule, Service } from '@cortec/types';
import exit from 'exit';
import pEachSeries from 'p-each-series';
import { timeout as pTimeout, TimeoutError } from 'promise-timeout';
import { Signale } from 'signale';

interface ICortecConfig extends Service {
  /**
   * @deprecated wtfnode is no longer supported as it causes issues with loading the project in certain environments.
   */
  printOpenHandles?: boolean;
  silent?: boolean;
  loadTimeout?: number;
  disposeTimeout?: number;
}

class Cortec implements IContext {
  service: ICortecConfig;
  private modules: Map<string, IModule> = new Map();
  private logger: Signale;
  private isDisposing = false;

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
    process.on('uncaughtException', (err) => {
      this.logger.fatal(err);
      this.dispose(1);
    });
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
    // Don't dispose if already disposing
    if (this.isDisposing) return;
    this.isDisposing = true;

    // Print to stderr that we are existing
    const logger = this.logger.scope('cortec');
    logger.pending('Exiting (%d)...', code);
    return pTimeout(
      pEachSeries([...this.modules].reverse(), ([name, module]) => {
        logger.pending('disposing module "' + name + '"');
        return module.dispose().catch((err) => {
          logger.scope(name).error(err);
        });
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

        // A negative exit code will cause the process to not exit.
        // This is useful for testing purposes.
        code >= 0 && exit(code);
      });
  }

  async load() {
    // Reset the disposing flag
    this.isDisposing = false;

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
