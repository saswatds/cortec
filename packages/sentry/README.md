# @cortec/sentry

## Module Overview

`@cortec/sentry` provides integration with [Sentry](https://sentry.io/) for error tracking and performance monitoring in Node.js applications. It wraps the official `@sentry/node` SDK and exposes it as a module for use within the Cortec framework, allowing centralized error reporting and release tracking.

## Configuration Options

Configuration for Sentry is provided via your application's configuration system under the `sentry` key. The options are passed directly to the Sentry SDK and typically include:

```yaml
sentry:
  dsn: '<your-sentry-dsn>'
  environment: 'production'
  tracesSampleRate: 1.0
  debug: false
  # ...other @sentry/node options
```

**Key Options:**

- `dsn`: Your Sentry project's DSN (required).
- `environment`: The environment name (e.g., "production", "staging").
- `tracesSampleRate`: Sampling rate for performance monitoring (0.0 - 1.0).
- `debug`: Enable debug logging for Sentry SDK.
- Any other options supported by [`@sentry/node`](https://docs.sentry.io/platforms/node/configuration/options/).

The module automatically sets the `release` field to `${ctx.service.name}@${ctx.service.version}` for better release tracking.

## Example Usage

```ts
import CortecSentry from '@cortec/sentry';

// Register the module in your Cortec context
const sentry = new CortecSentry();
context.use(sentry);

// After context.load(), you can access the Sentry API:
sentry.api.captureException(new Error('Something went wrong!'));
sentry.api.captureMessage('A warning or info message');

// Sentry will automatically report uncaught exceptions and unhandled promise rejections.
```

## Lifecycle

- On `load`, the module initializes Sentry with the provided configuration and release info.
- On `dispose`, it flushes and closes the Sentry client to ensure all events are sent.

## References

- [Sentry Node.js SDK Documentation](https://docs.sentry.io/platforms/node/)
- [Cortec Framework](https://github.com/saswatpadhi/cortec) (if public)

---
