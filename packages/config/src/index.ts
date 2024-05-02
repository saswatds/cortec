import type { IModule } from '@cortec/types';
import config from 'config';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';

/**
 * @deprecated
 */
export interface IConfig {
  get<T = unknown>(path: string): T;
}

/**
 * @deprecated
 */
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

export class Config {
  static get<T>(path: string, schema: z.Schema<T> = z.any()): T {
    let configObj;
    try {
      configObj = config.get(path);
    } catch (error) {
      throw new Error(
        `Config "${path}" not found in config/default.yml or any of the config/*.yml files`
      );
    }

    try {
      return schema.parse(config.util.toObject(configObj));
    } catch (error: any) {
      const err = fromError(error, { prefix: `Config "${path}" invalid` });
      throw new Error(err.toString());
    }
  }
}

export { z } from 'zod';
