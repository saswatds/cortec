import type { Cb, Ctx } from '@cortec/types';
import config from 'config';
import type { Cluster } from 'ioredis';
import Redis from 'ioredis';

export default function (ctx: Ctx, _: unknown, done: Cb) {
  const cacheConfig = config.util.toObject(config.get('cache')),
    cache: { [name: string]: Cluster | Redis } = {};

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
      cache[identity] = new Redis(redisOptions);

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

    cache[identity] = new Redis.Cluster(nodes, {
      ...clusterOptions,
      redisOptions,
    });
  });

  ctx.set('cache', (name: string) => cache[name]);

  return done(undefined, (next) => {
    [...Object.values(cache)].forEach((redis) => redis.disconnect());
    next();
  });
}
