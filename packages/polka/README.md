# @cortec/polka

## Module Overview

`@cortec/polka` provides a robust HTTP server framework built on [Polka](https://github.com/lukeed/polka), designed for modular, scalable APIs. It integrates seamlessly with other Cortec modules for logging, error handling, authentication, rate limiting, and more. The package supports middleware such as CORS, Helmet, compression, and body parsing, and is designed to work with a configuration-driven approach.

## Configuration Options

The Polka module expects its configuration under the `polka` key in your config files. The configuration schema is:

```js
{
  cors: CorsOptions, // CORS middleware options
  helmet: HelmetOptions, // Helmet security middleware options
  compression: CompressionOptions, // Compression middleware options
  bodyParser: {
    json: bodyParser.OptionsJson,
    raw: bodyParser.Options,
    text: bodyParser.OptionsText,
    urlencoded: bodyParser.OptionsUrlencoded,
  }
}
```

Example YAML configuration:

```yaml
polka:
  cors:
    origin: '*'
    methods: ['GET', 'POST']
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
