# @cortec/mongodb

## Module Overview

`@cortec/mongodb` provides a robust integration for managing MongoDB connections and databases within the Cortec ecosystem. It supports multiple database identities, SSL connections, and health checks, making it suitable for scalable, production-grade applications.

The module exposes methods to retrieve MongoDB clients and databases by identity, and ensures proper connection management and cleanup.

---

## Configuration Options

The configuration for this module should be provided under the `mongodb` key in your config files. Each identity can have its own connection and options.

```yaml
mongodb:
  main:
    connection:
      host: 'localhost'
      database: 'mydb'
      user: 'admin' # optional
      password: 'secret' # optional
      ssl: true # optional, enables TLS/SSL
    options:
      # MongoClientOptions (see official MongoDB Node.js driver docs)
      useUnifiedTopology: true
      connectTimeoutMS: 30000
  analytics:
    connection:
      host: 'analytics-db.local'
      database: 'analytics'
      ssl: false
    options: {}
```

**Connection Options:**

- `host` (string): MongoDB server hostname or IP.
- `database` (string): Database name to connect to.
- `user` (string, optional): Username for authentication.
- `password` (string, optional): Password for authentication.
- `ssl` (boolean, optional): Enable SSL/TLS for the connection.

**Options:**

- Any valid [MongoClientOptions](https://mongodb.github.io/node-mongodb-native/4.0/interfaces/MongoClientOptions.html).

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
