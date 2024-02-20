import type { IConfig } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { Cluster, RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';

export interface IRedis {
  cache(name: string): Cluster | Redis;
}

const defaultRedisConfig: RedisOptions = {
  enableOfflineQueue: true,
  enableReadyCheck: true,
  keepAlive: 10000,
};

export default class CortecRedis implements IModule, IRedis {
  name = 'redis';

  private $cache: { [name: string]: Cluster | Redis } = {};
  async load(ctx: IContext, sig: Sig) {
    const config = ctx.provide<IConfig>('config');
    const cacheConfig = config?.get<any>(this.name);

    Object.keys(cacheConfig).forEach((identity) => {
      const defaultConfig = cacheConfig[identity] || {},
        redisOptions = {
          ...defaultRedisConfig,
          ...defaultConfig.connection,
        };

      redisOptions.reconnectOnError = (err: Error) =>
        err.message && err.message.startsWith('READONLY');
      redisOptions.retryStrategy = (times: number) => {
        if (times >= defaultConfig.maxRetries) {
          return false;
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

      // Delete the nodes property from options
      delete clusterOptions.nodes;

      // Add the master node to nodes list
      nodes.unshift({
        host: redisOptions.host,
        port: redisOptions.port,
      });

      // We can now delete the host and port from redisOptions
      delete redisOptions.host;
      delete redisOptions.port;

      this.$cache[identity] = new Redis.Cluster(nodes, {
        ...clusterOptions,
        redisOptions,
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
}
