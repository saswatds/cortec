# @cortec/server

## Module Overview

`@cortec/server` provides a simple HTTP server abstraction for Node.js, designed to integrate seamlessly with the Cortec context and configuration system. It allows you to start an HTTP server with a custom request handler or a named handler module, and supports configuration-driven port selection.

This module is typically used as the entry point for web services in a Cortec-based application.

---

## Configuration Options

**Where to put config:**
Place your server config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
server:
  http:
    port: 8080 # The port number the server will listen on (default: 8080)
```

**Field-by-field explanation:**

- `server`: Root key for server config.
- `http`: Section for HTTP server options.
  - `port`: The port number the server will listen on.
    - **Type:** number
    - **Default:** 8080
    - **Required:** No (defaults to 8080 if not set)

**TypeScript interface:**

```typescript
interface IServerConfig {
  http: {
    port: number;
  };
}
```

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const serverConfig = config?.get<IServerConfig>('server');
```

If config is missing, the server will default to port 8080. If invalid, an error is thrown at startup.

---

## Example Usage

### 1. Using a Custom Request Handler

```typescript
import CortecServer from '@cortec/server';
import http from 'node:http';

const handler: http.RequestListener = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Cortec Server!');
};

const serverModule = new CortecServer(handler);

// Add to Cortec context and load as usual
context.use(serverModule);
await context.load();
```

### 2. Using a Named Handler Module

Suppose you have a handler module registered in your context (e.g., via `@cortec/polka`):

```typescript
const serverModule = new CortecServer('polka');
context.use(serverModule);
await context.load();
```

The server will look up the handler by name in the context.

---

## Lifecycle

- **load(ctx, sig):** Starts the HTTP server on the configured port.
- **dispose():** Gracefully shuts down the server.

---

## Notes

- The server will throw an error if the handler module is not found in the context.
- The port can be configured via your config files; if not specified, it defaults to `8080`.

---

## See Also

- [@cortec/polka](../polka/README.md) — for building HTTP handlers and routers.
- [@cortec/config](../config/README.md) — for configuration management.
