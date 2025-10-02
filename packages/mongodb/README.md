# @cortec/mongodb

## Module Overview

`@cortec/mongodb` provides a robust integration for managing MongoDB connections and databases within the Cortec ecosystem. It supports multiple database identities, SSL connections, and health checks, making it suitable for scalable, production-grade applications.

The module exposes methods to retrieve MongoDB clients and databases by identity, and ensures proper connection management and cleanup.

---

## Configuration Options

**Where to put config:**
Place your MongoDB config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
mongodb:
  main:
    connection:
      host: 'localhost' # MongoDB server hostname or IP
      database: 'mydb' # Database name to connect to
      user: 'admin' # optional, username for authentication
      password: 'secret' # optional, password for authentication
      ssl: true # optional, enables TLS/SSL
    options:
      useUnifiedTopology: true # optional, MongoClientOptions
      connectTimeoutMS: 30000 # optional, MongoClientOptions
  analytics:
    connection:
      host: 'analytics-db.local'
      database: 'analytics'
      ssl: false
    options: {}
```

**Field-by-field explanation:**

- `mongodb`: Root key for MongoDB config.
- `main`, `analytics`: Identity/name for this MongoDB instance (can be any string).
- `connection`: Connection options for [MongoClient](https://mongodb.github.io/node-mongodb-native/4.0/classes/MongoClient.html).
  - `host`: MongoDB server hostname or IP.
  - `database`: Database name to connect to.
  - `user`: Username for authentication (optional).
  - `password`: Password for authentication (optional).
  - `ssl`: If true, enables SSL/TLS for secure connections (optional).
- `options`: Additional [MongoClientOptions](https://mongodb.github.io/node-mongodb-native/4.0/interfaces/MongoClientOptions.html) (optional).

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const mongoConfig = config?.get<any>('mongodb');
```

If config is missing or invalid, an error is thrown at startup.

**Caveats:**

- If `ssl: true` is set, the module will automatically use `/var/platform/rds-combined-ca-bundle.pem` as the CA file for SSL.
- Each identity (e.g., `main`, `analytics`) creates a separate MongoDB client and database instance.
- All configuration validation and loading is handled internally; errors will be thrown if required fields are missing or connections fail.

---

## Example Usage

```ts
import CortecMongoDb from '@cortec/mongodb';

// Instantiate the module
const mongodb = new CortecMongoDb();

// After context is loaded:
const db = mongodb.db('main'); // Get the database instance
const client = mongodb.client('main'); // Get the MongoClient instance

// Health check (ping all databases)
await mongodb.healthCheck();

// Example: Find documents in a collection
const users = await db.collection('users').find({ active: true }).toArray();
```

---

## API

### Methods

- `db(name: string): Db`

  - Returns the MongoDB database instance for the given identity.

- `client(name: string): MongoClient`

  - Returns the MongoClient instance for the given identity.

- `healthCheck(): Promise<void>`
  - Pings all configured databases to verify connectivity.

---

## Notes

- SSL connections will automatically use `/var/platform/rds-combined-ca-bundle.pem` as the CA file if `ssl: true` is set.
- All configuration validation and loading is handled internally; errors will be thrown if required fields are missing or connections fail.
- Make sure your config files are properly structured and accessible to the application.

---
