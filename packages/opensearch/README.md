# @cortec/opensearch

## Module Overview

`@cortec/opensearch` provides a wrapper for managing connections to [OpenSearch](https://opensearch.org/) clusters. It supports multiple client instances, configuration via code or environment, and secure connections using CA certificates. The module is designed for use in service-oriented architectures and integrates with the Cortec context and lifecycle.

## Configuration Options

**Where to put config:**
Place your Opensearch config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
opensearch:
  main:
    connection:
      enabled: true # Whether to instantiate this client (required)
      user: 'admin' # Username for authentication (required)
      password: 'secret' # Password for authentication (required)
      host: 'opensearch.example.com' # Hostname of the OpenSearch node (required)
      port: 9200 # Port number (required)
      caFile: '/etc/ssl/certs/opensearch-ca.pem' # Optional path to CA certificate file for SSL
  analytics:
    connection:
      enabled: false
      user: 'readonly'
      password: 'readonlypass'
      host: 'analytics.example.com'
      port: 9200
```

**Field-by-field explanation:**

- `opensearch`: Root key for Opensearch config.
- `main`, `analytics`: Identity/name for each client (can be any string).
- `connection`: Connection options for each client.
  - `enabled`: If `true`, the client will be instantiated; if `false`, it will be skipped.
  - `user`: Username for authentication.
  - `password`: Password for authentication.
  - `host`: Hostname or IP address of the OpenSearch node.
  - `port`: Port number for the OpenSearch node.
  - `caFile`: (Optional) Path to CA certificate file for SSL connections.

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const opensearchConfig = config?.get<any>('opensearch');
```

If config is missing or invalid, an error is thrown at startup.

**Example YAML configuration:**

```yaml
opensearch:
  main:
    connection:
      enabled: true
      user: 'admin'
      password: 'secret'
      host: 'opensearch.example.com'
      port: 9200
      caFile: '/etc/ssl/certs/opensearch-ca.pem'
  analytics:
    connection:
      enabled: false
      user: 'readonly'
      password: 'readonlypass'
      host: 'analytics.example.com'
      port: 9200
```

## Example Usage

```ts
import { Opensearch } from '@cortec/opensearch';

// Instantiate the module (usually handled by Cortec context)
const opensearch = new Opensearch();

// After context.load()...
const client = opensearch.client('main');

// Use the OpenSearch client as per the official API
const result = await client.search({
  index: 'my-index',
  body: {
    query: {
      match: { title: 'example' },
    },
  },
});
console.log(result.body.hits.hits);
```

## Features

- Multiple named OpenSearch clients
- Secure connections with CA certificates
- Integration with Cortec context and lifecycle
- Health checks via `client.ping()`
- Configuration validation using `zod`

## API

- `client(identity: string): Client`
  Returns the OpenSearch client for the given identity. Throws if not found or not enabled.

## Notes

- Disabled clients (`enabled: false`) are skipped during instantiation.
- CA certificates are loaded from the filesystem if provided.
- Errors during connection or health check will throw and should be handled by the application.

---

For more details, see the source code in `src/index.ts` or the [OpenSearch JS client documentation](https://opensearch.org/docs/latest/clients/javascript/).
