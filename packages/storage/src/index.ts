import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';

import { type IBaseStorage, DiskStorage } from './diskstorage';

const schema = z.record(
  z.string(),
  z.object({
    dir: z.string(),
    makeParent: z.boolean(),
  })
);

export type IStorageConfig = z.infer<typeof schema>;

export interface IStorage {
  get(name: string): IBaseStorage;
}

export default class Storage implements IStorage, IModule {
  name = 'storage';
  private storages: { [name: string]: IBaseStorage } = {};

  async load(ctx: IContext, sig: Sig) {
    const storageConfig = Config.get(this.name, schema);

    for (const [identity, options] of Object.entries(storageConfig)) {
      this.storages[identity] = new DiskStorage(
        options.dir,
        options.makeParent
      );

      sig.scope(this.name, identity).info(`${options.dir} loaded`);
    }
  }

  get(name: string): IBaseStorage {
    const storage = this.storages[name];
    if (!storage) throw new Error(`Storage ${name} not found`);

    return storage;
  }

  async dispose() {
    await Promise.allSettled(
      [...Object.values(this.storages)].map((storage) => storage.dispose())
    );
  }
}
