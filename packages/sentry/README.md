# @cortec/sentry

## Module Overview

`@cortec/sentry` provides integration with [Sentry](https://sentry.io/) for error tracking and performance monitoring in Node.js applications. It wraps the official `@sentry/node` SDK and exposes it as a module for use within the Cortec framework, allowing centralized error reporting and release tracking.

## Configuration Options

**Where to put config:**
Place your Sentry config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
sentry:
  dsn: '<your-sentry-dsn>' # REQUIRED: Your Sentry project's DSN
  environment: 'production' # OPTIONAL: Environment name (e.g., "production", "staging")
  tracesSampleRate: 1.0 # OPTIONAL: Performance monitoring sample rate (0.0 - 1.0, default: 1.0)
  debug: false # OPTIONAL: Enable debug logging for Sentry SDK
  attachStacktrace: true # OPTIONAL: Attach stack traces to messages
  sendDefaultPii: false # OPTIONAL: Send personally identifiable information
  # ...any other @sentry/node options
```

**Field-by-field explanation:**

- `dsn`: **Required.** Your Sentry project's DSN (Data Source Name). Without this, Sentry will not report errors.
- `environment`: **Optional.** The environment name (e.g., "production", "staging", "dev"). Useful for filtering events in Sentry.
- `tracesSampleRate`: **Optional.** Sampling rate for performance monitoring (0.0 disables, 1.0 enables all). Default is 1.0.
- `debug`: **Optional.** If true, enables verbose debug logging for the Sentry SDK.
- `attachStacktrace`: **Optional.** If true, attaches stack traces to captured messages.
- `sendDefaultPii`: **Optional.** If true, sends personally identifiable information (PII) with events.
- Any other options supported by [`@sentry/node`](https://docs.sentry.io/platforms/node/configuration/options/).

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and passed to the Sentry SDK during initialization.
The module also sets the `release` field to `${ctx.service.name}@${ctx.service.version}` for better release tracking.

**Access in code:**

```typescript
const config = ctx.provide<IConfig>('config');
const sentryConfig = config?.get<sentry.NodeOptions>('sentry');
```

If config is missing or invalid, Sentry will not initialize and errors will be logged.

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
