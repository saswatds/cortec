# @cortec/newrelic

## Module Overview

`@cortec/newrelic` provides integration with [New Relic](https://newrelic.com/) for Node.js applications. It wraps the official New Relic agent and exposes it as a module for use in the Cortec framework, enabling automatic and manual instrumentation, error tracking, and custom metrics.

This module also sets up global handlers for uncaught exceptions and unhandled promise rejections, ensuring that errors are reported to New Relic.

---

## Configuration Options

**Where to put config:**
You can configure New Relic via environment variables, a `newrelic.js` file, or a YAML config (e.g., `config/default.yml`). The agent will automatically pick up environment variables and config files as per [official documentation](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/).

**Schema/Structure:**

- Environment variables (recommended for secrets):

  - `NEW_RELIC_LICENSE_KEY`: Your New Relic license key (**required**)
  - `NEW_RELIC_APP_NAME`: Application name (string)
  - `NEW_RELIC_LOG_LEVEL`: Logging verbosity (`info`, `debug`, etc.)
  - `NEW_RELIC_ENABLED`: Enable/disable agent (`true`/`false`)
  - `NEW_RELIC_DISTRIBUTED_TRACING_ENABLED`: Enable distributed tracing (`true`/`false`)
  - ...and more, see [full list](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/).

- YAML config example (`config/default.yml`):

```yaml
newrelic:
  app_name: 'MyApp'
  license_key: 'YOUR_LICENSE_KEY'
  log_level: 'info'
  distributed_tracing:
    enabled: true
  error_collector:
    enabled: true
  # See official docs for all options
```

**Field-by-field explanation:**

- `app_name`: Name of your application as shown in New Relic dashboard.
- `license_key`: Your New Relic license key (keep this secret).
- `log_level`: Verbosity of agent logs (`info`, `debug`, `warn`, `error`).
- `distributed_tracing.enabled`: Enables distributed tracing for requests.
- `error_collector.enabled`: Enables error collection and reporting.
- Additional fields are available for fine-tuning agent behavior (see [docs](https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/)).

**How config is loaded:**
The agent automatically loads config from environment variables, `newrelic.js`, or YAML config.
Within Cortec, you can access config via:

```typescript
const config = ctx.provide<IConfig>('config');
const nrConfig = config?.get<any>('newrelic');
```

If config is missing or invalid, the agent will log errors and may not start.

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
