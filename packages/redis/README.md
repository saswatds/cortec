# @cortec/redis

## Module Overview

`@cortec/redis` provides a flexible Redis integration for Node.js applications, supporting both single-node and cluster setups. It offers convenient methods for accessing Redis caches, performing health checks, and transforming objects for hash operations. The module is designed to work seamlessly with the Cortec context and configuration system.

## Configuration Options

The Redis module expects configuration in the following format (typically provided via your config files):

```js
{
  [identity: string]: {
    connection: {
      host: string,
      port: number,
      password?: string,
      db?: number,
      // Additional ioredis options...
    },
    maxRetries?: number,      // Maximum number of retry attempts
    encryption?: boolean,     // Enable TLS encryption
    cluster?: {
      nodes: Array<{ host: string, port: number }>,
      // Additional cluster options...
    }
  }
}
```

- **identity**: A unique name for each Redis instance (e.g., "cache", "session").
- **connection**: Standard Redis connection options.
- **maxRetries**: Number of times to retry on connection errors.
- **encryption**: If true, enables TLS for secure connections.
- **cluster**: If provided, enables Redis Cluster mode with the specified nodes.

## Example Usage

### Basic Usage

```js
import CortecRedis from '@cortec/redis';

// Instantiate with optional object transformation for hash operations
const redisModule = new CortecRedis(true);

// After loading the context and configuration:
const cache = redisModule.cache('cache'); // 'cache' is the identity from config

// Set and get a value
await cache.set('key', 'value');
const value = await cache.get('key');
console.log(value); // 'value'
```

### Health Check

```js
await redisModule.healthCheck(); // Throws if any Redis instance is unreachable
```

### Cluster Usage

If your configuration includes a `cluster` section, you can access the cluster instance in the same way:

```js
const clusterCache = redisModule.cache('clusteredCache');
await clusterCache.set('key', 'value');
```

## Advanced: Object Transformation for Hashes

If you instantiate `CortecRedis` with `transformObjects = true`, you can use objects directly with `hset` and get parsed objects from `hgetall`:

```js
const redisModule = new CortecRedis(true);
const cache = redisModule.cache('cache');

await cache.hset('user:1', { name: 'Alice', age: 30 });
const user = await cache.hgetall('user:1');
console.log(user); // { name: 'Alice', age: 30 }
```

## Disposal

To gracefully close all Redis connections:

```js
await redisModule.dispose();
```

---

For more details, see the implementation in `src/index.ts` and ensure your configuration matches your deployment needs (single-node or cluster).
