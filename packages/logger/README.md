# @cortec/logger

## Module Overview

`@cortec/logger` provides a structured logging interface for Node.js applications, built on top of [pino](https://github.com/pinojs/pino). It supports log levels, error serialization, and integration with New Relic for distributed tracing and error reporting. The logger is designed to be used as a module within the Cortec framework, but can be used standalone as well.

## Configuration Options

Logger configuration is typically provided via your application's configuration system (e.g., `config/default.yml` or similar). The main options are:

```yaml
logger:
  level: info # Log level: 'trace', 'debug', 'info', 'warn', 'error', 'fatal'
```

- `level` (string): The minimum log level to output. Defaults to `'info'` if not specified.

## Example Usage

```typescript
import CortecLogger from '@cortec/logger';

// Create an instance (usually handled by the framework)
const logger = new CortecLogger();

// Use log methods
logger.info('Application started');
logger.debug({ details: { foo: 'bar' } }, 'Debugging details');
logger.error(new Error('Something went wrong'));

// All standard log levels are available:
logger.trace('Trace message');
logger.warn('Warning message');
logger.fatal('Fatal error');

// Integration with New Relic (if available) automatically adds distributed tracing metadata to logs.
```

## Features

- Structured logging with pino
- Error serialization (including stack trace and custom details)
- Log level configuration
- Integration with New Relic for distributed tracing and error reporting
- Output to stdout/stderr based on log level

## Notes

- The logger is typically loaded and configured by the Cortec framework context.
- If New Relic is present, logs will include linking metadata for distributed tracing.
- Error objects passed to log methods are automatically serialized with stack trace and details.

## License

MIT
