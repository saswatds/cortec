import type { IModule } from '@cortec/types';
import config from 'config';

export interface IConfig {
  get<T = unknown>(path: string): T;
}

export default class CortecConfig implements IModule, IConfig {
  name = 'config';
  async load() {
    return Promise.resolve();
  }
  async dispose() {
    return Promise.resolve();
  }

  get(path: string) {
    return config.util.toObject(config.get(path));
  }
}
