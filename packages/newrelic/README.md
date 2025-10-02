# @cortec/newrelic

## Module Overview

`@cortec/newrelic` provides integration with [New Relic](https://newrelic.com/) for Node.js applications. It wraps the official New Relic agent and exposes it as a module for use in the Cortec framework, enabling automatic and manual instrumentation, error tracking, and custom metrics.

This module also sets up global handlers for uncaught exceptions and unhandled promise rejections, ensuring that errors are reported to New Relic.

---

## Configuration Options

The New Relic agent is configured via environment variables and/or a `newrelic.js` config file as per the [official documentation](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/).

Common environment variables include:

- `NEW_RELIC_LICENSE_KEY`: Your New Relic license key (required).
- `NEW_RELIC_APP_NAME`: The name of your application.
- `NEW_RELIC_LOG_LEVEL`: Logging verbosity (`info`, `debug`, etc.).
- `NEW_RELIC_ENABLED`: Enable/disable the agent (`true`/`false`).

You can also provide additional configuration in `config/newrelic.js` or `config/default.yml` if your project uses centralized config management.

---

## Example Usage

```typescript
import CortecNewrelic from '@cortec/newrelic';

// Create the module instance
const newrelic = new CortecNewrelic();

// Register with your Cortec context
context.use(newrelic);

// Access the New Relic API anywhere in your app
newrelic.api.noticeError(new Error('Something went wrong!'));

// The module automatically tracks uncaught exceptions and unhandled rejections.
```

### Manual Instrumentation Example

```typescript
// Start a custom transaction
newrelic.api.startBackgroundTransaction('MyCustomJob', () => {
  // ... your code here ...
  newrelic.api.addCustomAttribute('jobId', '12345');
});
```

---

## Notes

- The module automatically shuts down the New Relic agent and collects pending data on application exit.
- For full configuration options, see [New Relic Node.js Agent Docs](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/).
- Make sure to set the required environment variables before starting your application.

---
