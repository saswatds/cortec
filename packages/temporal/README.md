# @cortec/temporal

## Module Overview

`@cortec/temporal` provides integration with [Temporal](https://temporal.io/) for orchestrating distributed workflows and microservices. It supports both Temporal clients and workers, with flexible TLS configuration options (filesystem or AWS S3). This module is designed to be used within the Cortec framework, allowing you to manage Temporal connections and namespaces declaratively.

---

## Configuration Options

Configuration is provided via the `temporal` section in your config files. The schema supports both `clients` and `workers`, each keyed by an identity string.

### Example Configuration

```yaml
temporal:
  clients:
    main:
      namespace: 'default'
      address: 'temporal.example.com:7233'
      tls:
        source: 'filesystem'
        paths:
          ca: '/path/to/ca.pem'
          cert: '/path/to/cert.pem'
          key: '/path/to/key.pem'
  workers:
    worker1:
      namespace: 'default'
      address: 'temporal.example.com:7233'
      tls:
        source: 's3'
        region: 'us-east-1'
        bucket: 'my-tls-bucket'
        paths:
          ca: 'ca.pem'
          cert: 'cert.pem'
          key: 'key.pem'
```

### Schema

- `clients` / `workers`: Record of identities, each with:
  - `namespace`: Temporal namespace (string)
  - `address`: Temporal server address (string)
  - `tls`: TLS configuration (see below)

#### TLS Configuration

- **Filesystem**
  - `source`: `"filesystem"`
  - `paths`: `{ ca?: string, cert: string, key: string }`
- **S3**
  - `source`: `"s3"`
  - `region`: AWS region (string)
  - `bucket`: S3 bucket name (string)
  - `paths`: `{ ca?: string, cert: string, key: string }`

---

## Example Usage

### Registering the Temporal Module

```ts
import Temporal from '@cortec/temporal';

// Register the module in your Cortec context
const temporal = new Temporal();
context.use(temporal);

// After context.load()
const client = temporal.client('main');
const worker = temporal.worker('worker1');

// Access namespace and connection
console.log(client.namespace); // "default"
console.log(worker.connection); // NativeConnection instance
```

### Connecting to Temporal

The module automatically loads connections based on your config. TLS certificates are loaded from either the filesystem or S3, as specified.

### Closing Connections

When disposing the context, all Temporal connections are closed automatically.

---

## API

- `temporal.client(identity: string): { namespace: string, connection: Connection }`
- `temporal.worker(identity: string): { namespace: string, connection: NativeConnection }`

---

## Notes

- Ensure your TLS certificates are accessible at the configured paths or S3 locations.
- The module will throw if a requested client or worker identity is not found in the config.
- For advanced usage, see the Temporal Node SDK documentation: https://docs.temporal.io/typescript/introduction

---
