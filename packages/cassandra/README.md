# @cortec/cassandra

## Module Overview

`@cortec/cassandra` provides a wrapper for connecting to Apache Cassandra clusters, supporting both standard and AWS SigV4 authentication. It manages multiple Cassandra clients, each identified by a unique name, and handles SSL configuration for secure connections.

This module is designed to be used within the Cortec framework, leveraging its configuration and lifecycle management.

---

## Configuration Options

**Where to put config:**
Place your Cassandra config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
cassandra:
  main:
    auth: 'aws' # "aws" for AWS SigV4, "default" for standard
    options:
      contactPoints:
        - 'cassandra.example.com'
      localDataCenter: 'us-east-1'
      caPath: '/path/to/ca.pem' # required for AWS SigV4
      keyspace: 'my_keyspace'
      # ...other cassandra-driver options
  analytics:
    auth: 'default'
    options:
      contactPoints:
        - 'analytics-db.example.com'
      localDataCenter: 'us-east-1'
      keyspace: 'analytics'
```

**Field-by-field explanation:**

- `cassandra`: Root key for Cassandra config.
- `main`, `analytics`: Identity/name for this Cassandra client (can be any string).
- `auth`:
  - `"aws"`: Use AWS SigV4 authentication (requires AWS credentials in environment).
  - `"default"`: Use standard authentication.
- `options`: Passed directly to the [cassandra-driver](https://docs.datastax.com/en/developer/nodejs-driver/latest/) client.
  - `contactPoints`: List of Cassandra node hostnames/IPs.
  - `localDataCenter`: Data center name for load balancing.
  - `caPath`: Path to CA certificate file (required for AWS SigV4).
  - `keyspace`: Default keyspace to use.
  - Any other valid cassandra-driver options.

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const cassandraConfig = config?.get<any>('cassandra');
```

If config is missing or invalid, an error is thrown at startup.

---

## Example Usage

```ts
import CortecCassandra from '@cortec/cassandra';

// Create the module instance
const cassandra = new CortecCassandra();

// After context is loaded, get a client by name
const client = cassandra.client('main');

// Use the client to execute queries
const result = await client.execute('SELECT * FROM my_keyspace.my_table');

// Shutdown all clients when disposing
await cassandra.dispose();
```

---

## API

### Methods

- `client(name: string): Client | undefined`

  - Returns the Cassandra client for the given identity.

- `load(ctx: IContext)`

  - Loads and connects all configured Cassandra clients.

- `dispose()`
  - Shuts down all Cassandra clients.

---

## Notes

- For AWS SigV4 authentication, ensure your environment is configured with the necessary AWS credentials.
- SSL options are required for secure connections, especially when using AWS.
- All configuration is loaded via the Cortec config system.

---

## References

- [cassandra-driver documentation](https://docs.datastax.com/en/developer/nodejs-driver/latest/)
- [Cortec Framework](https://github.com/saswatpadhi/cortec)
