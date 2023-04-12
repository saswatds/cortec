import type { IConfig } from '@cortec/config';
import type { IContext, IModule } from '@cortec/types';
import type { Cluster } from 'ioredis';
import Redis from 'ioredis';
import type { TaskInnerAPI } from 'tasuku';

export interface IRedis {
  cache(name: string): Cluster | Redis;
}

export default class CortecRedis implements IModule, IRedis {
  name = 'redis';

  private $cache: { [name: string]: Cluster | Redis } = {};
  async load(ctx: IContext, task: TaskInnerAPI) {
    const config = ctx.provide<IConfig>('config');
    const cacheConfig = config?.get<any>(this.name);

    Object.keys(cacheConfig).forEach((identity) => {
      const defaultConfig = cacheConfig[identity] || {},
        redisOptions = { ...defaultConfig.connection };

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
      await task.task(`connection check for ${identity}`, () => redis.ping());
    }

    task.setTitle('Redis is ready');
  }
  async dispose() {
    [...Object.values(this.$cache)].forEach((redis) => redis.disconnect());
  }

  cache(name: string) {
    const cache = this.$cache[name];
    if (!cache) throw new Error(`Redis cache '${name}' not found`);

    return cache;
  }
}
