import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import stringify from 'fast-safe-stringify';
import type { Cluster, RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';

const parseJSON = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (_e) {
    return data;
  }
};

const objectToArray = function (
  obj: Record<string, any>,
  prefix?: string,
  arr: unknown[] = []
) {
  if (!obj) {
    return arr;
  }

  const usePrefix = prefix && typeof prefix === 'string';

  usePrefix && (prefix += '.');

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    usePrefix && (key = prefix + key);

    if (typeof value === 'object') {
      objectToArray(value, key, arr);
    } else {
      arr.push(key, stringify(value));
    }
  });

  return arr;
};

const arrayToObject = (arr: any[]) => {
  const obj: Record<string, any> = {};

  // eslint-disable-next-line no-magic-numbers
  for (let index = 0; index < arr.length; index += 2) {
    const key = arr[index];

    // eslint-disable-next-line no-magic-numbers
    obj[key] = parseJSON(arr[index + 1]);
  }

  return obj;
};

export interface IRedis {
  cache(name: string): Cluster | Redis;
  healthCheck(): Promise<void>;
}

const defaultRedisConfig: RedisOptions = {
  enableOfflineQueue: true,
  enableReadyCheck: true,
  keepAlive: 10000,
};

const RedisConfigSchema = z.record(
  z.string(),
  z.object({
    connection: z.object({
      host: z.string(),
      port: z.number(),
      password: z.string().optional(),
    }),
    encryption: z.boolean().optional(),
    cluster: z
      .object({
        nodes: z.array(z.any()).optional(),
      })
      .optional(),
    maxRetries: z.number(),
  })
);
type RedisConfig = z.infer<typeof RedisConfigSchema>;

export default class CortecRedis implements IModule, IRedis {
  name = 'redis';

  protected cacheConfig: RedisConfig;
  private $cache: { [name: string]: Cluster | Redis } = {};

  constructor(transformObjects = false) {
    this.cacheConfig = Config.get(this.name, RedisConfigSchema);
    if (transformObjects) {
      Redis.Command.setArgumentTransformer('hset', (args) => {
        if (args.length === 2 && typeof args[1] === 'object') {
          args = args.slice(0, 1).concat(objectToArray(args[1]));
        }
        return args;
      });

      Redis.Command.setReplyTransformer('hgetall', (result) => {
        return Array.isArray(result) ? arrayToObject(result) : result;
      });
    }
  }

  async load(ctx: IContext, sig: Sig) {
    Object.entries(this.cacheConfig).forEach(([identity, defaultConfig]) => {
      const redisOptions = {
        ...defaultRedisConfig,
        ...defaultConfig.connection,
      };

      redisOptions.reconnectOnError = (err: Error): boolean =>
        !!(err.message && err.message.startsWith('READONLY'));
      redisOptions.retryStrategy = (times: number) => {
        if (times >= defaultConfig.maxRetries) {
          return null;
        }

        // eslint-disable-next-line no-magic-numbers
        return Math.min(times * 50, 2000);
      };

      // If encryption is enabled then
      if (defaultConfig.encryption) {
        redisOptions.tls = {};
      }

      // If we are not running in cluster mode then its super simple
      if (!defaultConfig.cluster) {
        this.$cache[identity] = new Redis(redisOptions);

        return;
      }

      // From this point onwards we are working with CLUSTERs
      const clusterOptions = defaultConfig.cluster || {},
        { nodes = [] } = clusterOptions;

      // Redis options without host and port
      const { host, port, ...rest } = redisOptions;

      // Add the master node to nodes list
      nodes.unshift({
        host: host,
        port: port,
      });

      // Delete the nodes property from options
      delete clusterOptions.nodes;

      this.$cache[identity] = new Redis.Cluster(nodes, {
        ...clusterOptions,
        ...rest,
      });
    });

    for (const [identity, redis] of Object.entries(this.$cache)) {
      sig
        .scope(this.name, identity)
        .await(
          `connecting to redis://${
            redis instanceof Redis ? redis.options.host : 'cluster'
          }`
        );
      await redis.ping();
      sig
        .scope(this.name, identity)
        .success(
          `connected to redis://${
            redis instanceof Redis ? redis.options.host : 'cluster'
          }`
        );
    }
  }
  async dispose() {
    await Promise.allSettled(
      [...Object.values(this.$cache)].map(async (redis) => redis.quit())
    );
  }

  cache(name: string) {
    const cache = this.$cache[name];
    if (!cache) throw new Error(`Redis cache '${name}' not found`);

    return cache;
  }

  async healthCheck() {
    return Promise.all(
      Object.values(this.$cache).map((redis) => redis.ping())
    ).then(() => undefined);
  }
}
