# @cortec/opensearch

## Module Overview

`@cortec/opensearch` provides a wrapper for managing connections to [OpenSearch](https://opensearch.org/) clusters. It supports multiple client instances, configuration via code or environment, and secure connections using CA certificates. The module is designed for use in service-oriented architectures and integrates with the Cortec context and lifecycle.

## Configuration Options

Configuration is provided as a map of identities to connection objects. Each connection can be enabled/disabled and supports authentication and SSL.

```ts
{
  [identity: string]: {
    connection: {
      enabled: boolean;         // Whether to instantiate this client
      user: string;             // Username for authentication
      password: string;         // Password for authentication
      host: string;             // Hostname of the OpenSearch node
      port: number;             // Port number
      caFile?: string;          // Optional path to CA certificate file for SSL
    }
  }
}
```

Example YAML configuration (`config/opensearch.yml`):

```yaml
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
