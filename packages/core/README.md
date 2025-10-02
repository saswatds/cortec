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

**Where to put config:**
You can pass configuration directly when constructing the core context, or load it from your `package.json` or a config file.

**Schema:**

```typescript
interface ICortecConfig {
  name: string; // Application name (required)
  version: string; // Application version (required)
  printOpenHandles?: boolean; // Print open handles on exit (for debugging, optional, default: false)
  silent?: boolean; // Suppress logging output (optional, default: false)
  loadTimeout?: number; // Timeout for loading modules in ms (optional, default: 60000)
  disposeTimeout?: number; // Timeout for disposing modules in ms (optional, default: 5000)
  // ...other fields from package.json are allowed
}
```

**Field-by-field explanation:**

- `name`: The name of your application. Used for identification and reporting (required).
- `version`: The version of your application (required).
- `printOpenHandles`: If true, prints open handles on exit for debugging resource leaks (optional).
- `silent`: If true, disables logging output (optional).
- `loadTimeout`: Maximum time (ms) to wait for all modules to load before timing out (optional).
- `disposeTimeout`: Maximum time (ms) to wait for all modules to dispose before timing out (optional).
- Other fields: You may include additional fields from your `package.json` for convenience.

**Example YAML config (if using config files):**

```yaml
name: 'my-app'
version: '1.0.0'
printOpenHandles: true
silent: false
loadTimeout: 60000
disposeTimeout: 5000
```

**How config is loaded:**
You can pass the config object directly when constructing the core context:

```typescript
const cortec = new Cortec({
  name: 'my-app',
  version: '1.0.0',
  printOpenHandles: true,
  silent: false,
  loadTimeout: 60000,
  disposeTimeout: 5000,
});
```

Or load from your `package.json`:

```typescript
const pkg = require('./package.json');
const cortec = new Cortec(pkg);
```

If required fields (`name`, `version`) are missing, an error will be thrown at startup.

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
