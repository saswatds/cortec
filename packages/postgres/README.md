# @cortec/postgres

## Module Overview

`@cortec/postgres` provides a robust integration with PostgreSQL using connection pooling via the `pg` library. It supports multiple database identities, SSL configuration, and runtime health checks. The module is designed to be used within the Cortec context system, allowing seamless dependency injection and lifecycle management.

---

## Configuration Options

Configuration is provided as a map of identities, each with its own connection settings. The schema is validated using `zod` and supports advanced PostgreSQL options.

```ts
{
  [identity: string]: {
    connection: {
      user: string;                      // Database username
      password: string;                  // Database password
      host: string;                      // Hostname or IP address
      port: number;                      // Port number
      database: string;                  // Database name
      ssl?: {
        ca?: string;                     // Path to CA certificate
        key?: string;                    // Path to client key
        cert?: string;                   // Path to client certificate
        rejectUnauthorized: boolean;     // Whether to reject unauthorized SSL
      };
      statement_timeout?: number;        // Statement timeout in ms
      query_timeout?: number;            // Query timeout in ms
      lock_timeout?: number;             // Lock timeout in ms
      connectionTimeoutMillis?: number;  // Connection timeout in ms
      idle_in_transaction_session_timeout?: number; // Idle transaction timeout
      idleTimeoutMillis?: number;        // Idle timeout in ms
      max?: number;                      // Max pool size
      allowExitOnIdle?: boolean;         // Allow exit on idle
    }
  }
}
```

---

## Example Usage

```ts
import CortecPostgres from '@cortec/postgres';

// Instantiate the module (usually handled by Cortec context)
const postgres = new CortecPostgres();

// After context.load(), access a database pool by identity:
const pool = postgres.db('main');

// Run a query
const result = await pool.query('SELECT 1');

// Use SSL configuration (if needed) in your config file:
// postgres:
//   main:
//     connection:
//       user: myuser
//       password: mypass
//       host: db.example.com
//       port: 5432
//       database: mydb
//       ssl:
//         ca: /path/to/ca.pem
//         key: /path/to/client-key.pem
//         cert: /path/to/client-cert.pem
//         rejectUnauthorized: true
```

---

## Lifecycle

- **load(ctx, sig):** Connects to all configured databases, validates connections, and initializes pools.
- **dispose():** Gracefully closes all pools.

---

## Notes

- All configuration is validated at startup; errors will be thrown for missing or invalid options.
- SSL certificates can be loaded from disk using the provided paths.
- Pools are managed per identity, allowing multiple database connections in a single application.

---
