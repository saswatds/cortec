# @cortec/core

## Module Overview

The `@cortec/core` package provides the foundation for dependency injection, lifecycle management, and service orchestration in the Cortec ecosystem. It is responsible for loading modules, managing their dependencies, handling graceful shutdowns, and providing a context for accessing services and modules.

Key features:

- Dependency injection via context
- Module lifecycle management (`load`, `dispose`)
- Centralized configuration and logging
- Graceful shutdown on signals (`SIGINT`, `SIGTERM`)
- Error handling for uncaught exceptions

## Configuration Options

The core service accepts the following configuration options (via the `service` object):

```typescript
interface ICortecConfig {
  printOpenHandles?: boolean; // Print open handles on exit (for debugging)
  silent?: boolean; // Suppress logging output
  loadTimeout?: number; // Timeout for loading modules (ms)
  disposeTimeout?: number; // Timeout for disposing modules (ms)
}
```

These options are typically passed when instantiating the core context:

```typescript
const serviceConfig: ICortecConfig = {
  printOpenHandles: true,
  silent: false,
  loadTimeout: 60000,
  disposeTimeout: 5000,
};
```

## Example Usage

```typescript
import Cortec from '@cortec/core';
import SomeModule from '@cortec/some-module';

const serviceConfig = {
  printOpenHandles: true,
  silent: false,
  loadTimeout: 60000,
  disposeTimeout: 5000,
};

const cortec = new Cortec(serviceConfig);

// Register modules
cortec.use(new SomeModule());

// Load all modules (calls their `load` method)
await cortec.load();

// Access a module by name
const someModule = cortec.require<SomeModule>('some-module');

// Dispose all modules gracefully (calls their `dispose` method)
await cortec.dispose(0);
```

## API Reference

### Context Methods

- `has(name: string): boolean`
  Check if a module is registered.

- `provide<T>(name: string): T | undefined`
  Get a module by name (returns undefined if not found).

- `require<T>(name: string): T`
  Get a module by name (throws if not found).

- `use(module: IModule)`
  Register a module.

- `load(): Promise<void>`
  Load all registered modules.

- `dispose(code: number): Promise<void>`
  Dispose all modules and exit with the given code.

## Lifecycle

- **Loading:** Calls `load(context, logger)` on each registered module.
- **Disposing:** Calls `dispose()` on each registered module in reverse order.
- **Error Handling:** Uncaught exceptions trigger disposal and logging.

## Signals

- `SIGINT` and `SIGTERM` will trigger graceful shutdown via `dispose`.

---

For more details, see the source code in `src/index.ts`.
