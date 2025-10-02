# @cortec/elastic

## Module Overview

`@cortec/elastic` provides integration with [Elasticsearch](https://www.elastic.co/elasticsearch/) using the official Node.js client. It supports multiple client instances, configurable via your application's configuration files, and allows secure connections with CA certificates.

This module is designed to be used within the Cortec framework, providing a standardized way to manage Elasticsearch connections and clients.

---

## Configuration Options

**Where to put config:**
Place your Elastic config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
elastic:
  myClient:
    connection:
      user: 'elasticuser' # Username for authentication
      password: 'elasticpass' # Password for authentication
      host: 'localhost' # Hostname or IP of Elasticsearch node
      port: 9200 # Port number (default: 9200)
      caFile: '/path/to/ca.pem' # Optional, path to CA certificate file for SSL
  analytics:
    connection:
      user: 'readonly'
      password: 'readonlypass'
      host: 'analytics.example.com'
      port: 9200
```

**Field-by-field explanation:**

- `elastic`: Root key for Elastic config.
- `myClient`, `analytics`: Identity/name for each Elasticsearch client (can be any string).
- `connection`: Connection options for [@elastic/elasticsearch](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html).
  - `user`: Username for authentication.
  - `password`: Password for authentication.
  - `host`: Hostname or IP address of the Elasticsearch node.
  - `port`: Port number for the node (default: 9200).
  - `caFile`: Path to CA certificate file for SSL connections (optional).

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const elasticConfig = config?.get<any>('elastic');
```

If config is missing or invalid, an error is thrown at startup.

You may define multiple clients by specifying different keys under `elastic`.

---

## Example Usage

```ts
import { Elastic } from '@cortec/elastic';

// Instantiate the module (usually handled by Cortec context)
const elastic = new Elastic();

// After context is loaded:
const client = elastic.client('myClient');

// Example: Ping the Elasticsearch node
await client.ping();

// Example: Index a document
await client.index({
  index: 'my-index',
  document: { foo: 'bar' },
});

// Example: Search documents
const result = await client.search({
  index: 'my-index',
  query: { match_all: {} },
});
console.log(result.hits.hits);
```

---

## Notes

- The module automatically loads configuration and creates clients for each identity defined in your config.
- If `caFile` is provided, the client will use the specified CA certificate for SSL connections.
- All clients are closed automatically when the module is disposed.

---

## See Also

- [Elasticsearch Node.js Client Documentation](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Cortec Framework](https://github.com/saswatpadhi/cortec)
