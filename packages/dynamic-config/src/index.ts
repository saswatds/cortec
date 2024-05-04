import { Config, z } from '@cortec/config';
import type { IMongoDb } from '@cortec/mongodb';
import type { IContext, IModule, Sig } from '@cortec/types';

const dynamicConfig = z.object({
  source: z.object({
    type: z.string(),
    mongodb: z.object({
      name: z.string(),
      collection: z.string(),
    }),
  }),
  ttl: z.number().optional(),
  default: z.any(),
});

type DynConfig = z.infer<typeof dynamicConfig>;

export interface IDynamicConfig<K> {
  config: K;
  refresh: () => Promise<void>;
  update: (config: K, ttl?: number) => Promise<void>;
}

export default class DynamicConfig<K = any>
  implements IModule, IDynamicConfig<K>
{
  name = 'dynamic-config';
  private namespace: string;
  private $config: DynConfig;
  private configDef: z.Schema<K>;
  private state: K | undefined;
  private refreshClear: NodeJS.Timeout | undefined;

  constructor(def: z.Schema<K>, namespace = 'default') {
    this.namespace = namespace;
    const schema = dynamicConfig.extend({ default: def });
    this.$config = Config.get(this.name, schema);
    this.configDef = def;
  }

  get config(): K {
    return this.state || this.$config.default;
  }

  refresh: () => Promise<void> = () => Promise.resolve();
  update: (console: K, ttl?: number) => Promise<void> = () => Promise.resolve();

  async load(ctx: IContext, sig: Sig) {
    if (this.$config.source.type === 'mongodb') {
      sig
        .scope(this.name, this.namespace)
        .await('loading dynamic config from mongodb');
      const mongodb = ctx.provide<IMongoDb>('mongodb');

      if (!mongodb)
        throw new Error('mongodb module is required for dynamic-config');

      this.refresh = async () => {
        // get the latest config from mongodb
        const data = await mongodb
          .db(this.$config.source.mongodb.name)
          .collection(this.$config.source.mongodb.collection)
          .findOne(
            { key: this.namespace },
            { projection: { _id: 0, config: 1, ttl: 1 } }
          );

        if (data) {
          const ttl = data['ttl'];
          this.state = this.configDef.parse(data['config']);
          sig
            .scope(this.name, this.namespace)
            .success('dynamic config synced mongodb');
          this.refreshClear = setTimeout(this.refresh, ttl);
        } else {
          sig
            .scope(this.name, this.namespace)
            .warn('no dynamic config found in mongodb');
          this.refreshClear = setTimeout(this.refresh, 2 * 60 * 1000);
        }
      };

      this.update = async (config: K, ttl?: number) => {
        // Validate the config
        this.configDef.parse(config);
        // update the config in mongodb
        await mongodb
          .db(this.$config.source.mongodb.name)
          .collection(this.$config.source.mongodb.collection)
          .updateOne(
            { key: this.namespace },
            {
              $set: {
                key: this.namespace,
                config,
                ttl: ttl ?? this.$config.ttl ?? 5 * 60 * 1000,
              },
            },
            { upsert: true }
          );
        this.state = config;
        sig
          .scope(this.name, this.namespace)
          .success('dynamic config updated in mongodb');
      };

      await this.refresh();
    }
  }

  async dispose() {
    this.refreshClear && clearTimeout(this.refreshClear);
  }
}
