# @cortec/redis

## Module Overview

`@cortec/redis` provides a flexible Redis integration for Node.js applications, supporting both single-node and cluster setups. It offers convenient methods for accessing Redis caches, performing health checks, and transforming objects for hash operations. The module is designed to work seamlessly with the Cortec context and configuration system.

## Configuration Options

**Where to put config:**
Place your Redis config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
redis:
  cache:
    connection:
      host: 'localhost'
      port: 6379
      password: 'secret' # optional
      db: 0 # optional, default: 0
    maxRetries: 5 # optional, default: 5
    encryption: false # optional, enables TLS if true
    cluster: # optional, enables Redis Cluster mode
      nodes:
        - host: 'localhost'
          port: 6379
        - host: 'localhost'
          port: 6380
```

**Field-by-field explanation:**

- `redis`: Root key for Redis config.
- `cache`: Identity/name for this Redis instance (can be any string, e.g. "session", "main", etc.).
- `connection`: Connection options for [ioredis](https://github.com/luin/ioredis).
  - `host`: Redis server hostname or IP.
  - `port`: Redis server port.
  - `password`: Password for authentication (optional).
  - `db`: Database index (optional, default is 0).
- `maxRetries`: Maximum number of retry attempts before giving up (optional, default is 5).
- `encryption`: If true, enables TLS/SSL for secure connections (optional).
- `cluster`: If present, enables Redis Cluster mode.
  - `nodes`: List of cluster node objects, each with `host` and `port`.

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const redisConfig = config?.get<any>('redis');
```

If config is missing or invalid, an error is thrown at startup.

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
