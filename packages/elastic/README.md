# @cortec/elastic

## Module Overview

`@cortec/elastic` provides integration with [Elasticsearch](https://www.elastic.co/elasticsearch/) using the official Node.js client. It supports multiple client instances, configurable via your application's configuration files, and allows secure connections with CA certificates.

This module is designed to be used within the Cortec framework, providing a standardized way to manage Elasticsearch connections and clients.

---

## Configuration Options

Configuration is expected under the `elastic` key in your config files (e.g., `config/default.yml`). The schema is as follows:

```yaml
elastic:
  myClient:
    connection:
      user: <string> # Username for authentication
      password: <string> # Password for authentication
      host: <string> # Hostname or IP of Elasticsearch node
      port: <number> # Port number (default: 9200)
      caFile: <string> # Path to CA certificate file (optional, for SSL)
```

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
