# @cortec/polka

## Module Overview

`@cortec/polka` provides a robust HTTP server framework built on [Polka](https://github.com/lukeed/polka), designed for modular, scalable APIs. It integrates seamlessly with other Cortec modules for logging, error handling, authentication, rate limiting, and more. The package supports middleware such as CORS, Helmet, compression, and body parsing, and is designed to work with a configuration-driven approach.

## Configuration Options

**Where to put config:**
Place your Polka config in `config/default.yml` (or your environment-specific config file).

**Schema/Structure:**

```yaml
polka:
  cors: # CORS middleware options
    origin: '*' # Allowed origins (string or array)
    methods: ['GET', 'POST'] # Allowed HTTP methods
    credentials: false # Allow credentials (optional)
  helmet: # Helmet security middleware options
    contentSecurityPolicy: false
    # ...other helmet options
  compression: # Compression middleware options
    threshold: 1024 # Minimum response size to compress (bytes)
  bodyParser: # Body parser options for different content types
    json:
      limit: '1mb' # Max JSON body size
    raw: {} # Options for raw body parsing
    text: {} # Options for text body parsing
    urlencoded:
      extended: true # Use extended query string parsing
```

**Field-by-field explanation:**

- `polka`: Root key for Polka config.
- `cors`: [CORS](https://github.com/expressjs/cors#configuration-options) options.
  - `origin`: Allowed origins (string, array, or boolean).
  - `methods`: Allowed HTTP methods (array of strings).
  - `credentials`: Allow credentials (boolean, optional).
  - Other options as per CORS middleware.
- `helmet`: [Helmet](https://helmetjs.github.io/) options for HTTP header security.
  - `contentSecurityPolicy`: Enable/disable CSP (boolean).
  - Other options as per Helmet middleware.
- `compression`: [Compression](https://github.com/expressjs/compression#options) options.
  - `threshold`: Minimum response size to compress (bytes).
  - Other options as per compression middleware.
- `bodyParser`: Options for parsing request bodies.
  - `json`: Options for JSON bodies (e.g., `limit` for max size).
  - `raw`: Options for raw bodies.
  - `text`: Options for text bodies.
  - `urlencoded`: Options for URL-encoded bodies (e.g., `extended`).

**Example YAML configuration:**

```yaml
polka:
  cors:
    origin: '*'
    methods: ['GET', 'POST']
    credentials: false
  helmet:
    contentSecurityPolicy: false
  compression:
    threshold: 1024
  bodyParser:
    json:
      limit: '1mb'
    raw: {}
    text: {}
    urlencoded:
      extended: true
```

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const polkaConfig = config?.get<any>('polka');
```

If config is missing or invalid, an error is thrown at startup.

## Example Usage

Below is a minimal example of how to use the Polka module in a Cortec context:

```ts
import Polka from '@cortec/polka';
import { route } from '@cortec/polka/types';

// Define your router
const router = (app, ctx) => {
  app.get(
    '/hello',
    route({
      onRequest: async (req, ctx) => ({
        status: 200,
        body: { message: 'Hello, world!' },
      }),
    })
  );
};

// Create the Polka module
const polkaModule = new Polka(router);

// Register with Cortec context
context.use(polkaModule);

// After context.load(), you can get the HTTP handler:
const handler = polkaModule.handler();
```

### Features

- **Error Handling:** Integrated with NewRelic, Sentry, and custom error classes.
- **Rate Limiting:** Supports Redis-backed rate limiting per route.
- **Body Parsing:** Configurable for JSON, raw, text, and URL-encoded bodies.
- **Security:** Helmet middleware for HTTP header protection.
- **CORS:** Configurable cross-origin resource sharing.
- **Static Files:** Easily serve static assets via `app.static(path, dir, options)`.

## Advanced Example: Route with Rate Limiting and Validation

```ts
app.post(
  '/api/data',
  route({
    schema: {
      body: z.object({ foo: z.string() }),
    },
    rateLimit: {
      cache: 'main', // Redis cache name
      duration: 60, // seconds
      limit: 100, // requests per duration
      count: (ctx, req, reqCtx) => reqCtx.session?.userId ?? 'anonymous',
    },
    onRequest: async (req, ctx) => ({
      status: 201,
      body: { received: req.body.foo },
    }),
  })
);
```

## Notes

- The Polka module expects to be loaded in a Cortec context with required dependencies (logger, sentry, newrelic, redis, etc.).
- Error responses are standardized and traceable via trace IDs.
- For full type definitions and advanced usage, see the source code and exported types in `src/types.ts`.

---
