# Cortec

> **Note:** The public API is under development and may change.

A TypeScript-first, opinionated ecosystem of modules and adapters for building production-ready backend services. Cortec provides standardized dependency injection, lifecycle management, and integrations for databases, queues, logging, and more.

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Modules](#modules)
- [Example Usage](#example-usage)
- [Custom Modules](#custom-modules)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Cortec helps you build backend services with minimal boilerplate by providing a set of modules for common tasks (HTTP, databases, queues, logging, etc.) and a unified way to load, configure, and manage them.

**Core Principles:**

- TypeScript native
- Dependency injection
- Production-ready defaults
- Extensible and modular

---

## Getting Started

Install the core modules:

```bash
npm i @cortec/core @cortec/polka @cortec/server
```

Create a minimal server:

```typescript
import Cortec from '@cortec/core';
import Polka from '@cortec/polka';
import Server from '@cortec/server';

const cortec = new Cortec({ name: 'my-app', version: '1.0.0' });
const polka = new Polka((app) =>
  app.get('/', (req, res) => res.end('Hello World'))
);
const server = new Server(polka.name);

cortec.use(polka);
cortec.use(server);

await cortec.load();
```

Add configuration in `config/default.yml`:

```yaml
server:
  http:
    port: 8080
polka:
  bodyParser:
    json:
      limit: '100kb'
```

---

## Modules

Cortec provides a suite of modules for common backend tasks. Click each for details:

| Module         | Description                                 | Link                                                          |
| -------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Core           | Dependency injection & lifecycle management | [@cortec/core](./packages/core/README.md)                     |
| Config         | Typed config loader                         | [@cortec/config](./packages/config/README.md)                 |
| Polka          | HTTP server & routing                       | [@cortec/polka](./packages/polka/README.md)                   |
| Server         | HTTP server abstraction                     | [@cortec/server](./packages/server/README.md)                 |
| Redis          | Redis integration                           | [@cortec/redis](./packages/redis/README.md)                   |
| MongoDB        | MongoDB integration                         | [@cortec/mongodb](./packages/mongodb/README.md)               |
| Postgres       | PostgreSQL integration                      | [@cortec/postgres](./packages/postgres/README.md)             |
| BullMQ         | Job queues with BullMQ                      | [@cortec/bullmq](./packages/bullmq/README.md)                 |
| RabbitMQ       | Message queues with RabbitMQ                | [@cortec/rabbitmq](./packages/rabbitmq/README.md)             |
| Logger         | Structured logging                          | [@cortec/logger](./packages/logger/README.md)                 |
| Sentry         | Error tracking                              | [@cortec/sentry](./packages/sentry/README.md)                 |
| NewRelic       | Performance monitoring                      | [@cortec/newrelic](./packages/newrelic/README.md)             |
| Axios          | HTTP client wrapper                         | [@cortec/axios](./packages/axios/README.md)                   |
| Cassandra      | Cassandra DB integration                    | [@cortec/cassandra](./packages/cassandra/README.md)           |
| Elastic        | Elasticsearch integration                   | [@cortec/elastic](./packages/elastic/README.md)               |
| Opensearch     | OpenSearch integration                      | [@cortec/opensearch](./packages/opensearch/README.md)         |
| Storage        | File storage abstraction                    | [@cortec/storage](./packages/storage/README.md)               |
| Dynamic Config | Runtime config from DB                      | [@cortec/dynamic-config](./packages/dynamic-config/README.md) |
| Temporal       | Temporal workflow integration               | [@cortec/temporal](./packages/temporal/README.md)             |
| Types          | Shared type definitions                     | [@cortec/types](./packages/types/README.md)                   |

---

## Example Usage

See each module’s README for configuration and usage examples.

---

## Custom Modules

To create your own module, implement the `IModule` interface:

```typescript
import { IModule } from '@cortec/core';

class MyModule implements IModule {
  name = 'my-module';
  async load() {
    /* ... */
  }
  async dispose() {
    /* ... */
  }
}
```

Register with Cortec:

```typescript
cortec.use(new MyModule());
await cortec.load();
```

---

## Contributing

Contributions are welcome! Please open issues or pull requests.

---

## License

MIT
