# @cortec/temporal

## Module Overview

`@cortec/temporal` provides integration with [Temporal](https://temporal.io/) for orchestrating distributed workflows and microservices. It supports both Temporal clients and workers, with flexible TLS configuration options (filesystem or AWS S3). This module is designed to be used within the Cortec framework, allowing you to manage Temporal connections and namespaces declaratively.

---

## Configuration Options

**Where to put config:**
Place your Temporal config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
temporal:
  clients:
    main:
      namespace: "default"                # Temporal namespace
      address: "temporal.example.com:7233"# Temporal server address
      tls:
        source: "filesystem"              # "filesystem" or "s3"
        paths:
          ca: "/path/to/ca.pem"           # optional, CA certificate
          cert: "/path/to/cert.pem"       # required, client certificate
          key: "/path/to/key.pem"         # required, client key
  workers:
    worker1:
      namespace: "default"
      address: "temporal.example.com:7233"
      tls:
        source: "s3"
        region: "us-east-1"               # AWS region (required for S3)
        bucket: "my-tls-bucket"           # S3 bucket name (required for S3)
        paths:
          ca: "ca.pem"                    # optional, CA certificate in S3
          cert: "cert.pem"                # required, client certificate in S3
          key: "key.pem"                  # required, client key in S3
```

**Field-by-field explanation:**

- `temporal`: Root key for Temporal config.
- `clients`: Map of client identities to config.
  - `namespace`: Temporal namespace (string, required).
  - `address`: Temporal server address (string, required).
  - `tls`: TLS configuration for secure connection.
    - `source`: `"filesystem"` or `"s3"`. Determines where TLS certs are loaded from.
    - `paths`: Object with certificate file paths or S3 keys.
      - `ca`: CA certificate (optional, recommended for security).
      - `cert`: Client certificate (required).
      - `key`: Client key (required).
    - For S3:
      - `region`: AWS region (required).
      - `bucket`: S3 bucket name (required).
- `workers`: Map of worker identities to config (same structure as `clients`).

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const temporalConfig = config?.get<any>('temporal');
```

If config is missing or invalid, an error is thrown at startup.

**Caveats:**

- TLS certificates must be accessible at the configured paths or S3 locations.
- If any required field is missing, the module will throw an error and fail to connect.
- You can define multiple clients and workers for different namespaces or environments.

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
