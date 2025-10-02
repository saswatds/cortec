# @cortec/cassandra

## Module Overview

`@cortec/cassandra` provides a wrapper for connecting to Apache Cassandra clusters, supporting both standard and AWS SigV4 authentication. It manages multiple Cassandra clients, each identified by a unique name, and handles SSL configuration for secure connections.

This module is designed to be used within the Cortec framework, leveraging its configuration and lifecycle management.

---

## Configuration Options

The configuration for Cassandra clients should be provided under the `cassandra` key in your config files. Each client is identified by an `identity` string.

### Example Configuration

```yaml
cassandra:
  main:
    auth: 'aws' # or "default"
    options:
      contactPoints:
        - 'cassandra.example.com'
      localDataCenter: 'us-east-1'
      caPath: '/path/to/ca.pem' # required for AWS SigV4
      keyspace: 'my_keyspace'
      # ...other options from cassandra-driver
  analytics:
    auth: 'default'
    options:
      contactPoints:
        - 'analytics-db.example.com'
      localDataCenter: 'us-east-1'
      keyspace: 'analytics'
```

- **auth**: `"aws"` for AWS SigV4 authentication, `"default"` for standard authentication.
- **options**: Options passed to the [cassandra-driver](https://docs.datastax.com/en/developer/nodejs-driver/latest/) client. For AWS, `caPath` is required for SSL.

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
