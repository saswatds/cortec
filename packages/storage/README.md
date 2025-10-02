# @cortec/storage

## Module Overview

The `@cortec/storage` package provides a unified interface for managing file storage backends. It currently supports disk-based storage and is designed to be extensible for other storage providers. The module allows you to configure multiple storage instances, each with its own directory and options, and access them by name.

## Configuration Options

**Where to put config:**
Place your storage config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
storage:
  uploads:
    dir: '/var/app/uploads'
    makeParent: true
  logs:
    dir: '/var/app/logs'
    makeParent: false
```

**Field-by-field explanation:**

- `storage`: Root key for Storage config.
- `uploads`, `logs`: Identity/name for each storage instance (can be any string).
- `dir`: Directory path for storage. This is where files will be read/written.
- `makeParent`: If true, parent directories will be created automatically if missing.

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
import { Config } from '@cortec/config';
const storageConfig = Config.get('storage');
```

If config is missing or invalid, an error is thrown at startup.

**Example YAML:**

```yaml
storage:
  uploads:
    dir: '/var/app/uploads'
    makeParent: true
  logs:
    dir: '/var/app/logs'
    makeParent: false
```

## Example Usage

```ts
import Storage from '@cortec/storage';

// After context is loaded and storage module is initialized
const storage = new Storage();

// Get a storage instance by name
const uploadsStorage = storage.get('uploads');

// Use the storage instance (DiskStorage API)
await uploadsStorage.writeFile('example.txt', 'Hello, world!');
const content = await uploadsStorage.readFile('example.txt');
console.log(content); // "Hello, world!"

// Dispose all storage instances when shutting down
await storage.dispose();
```

## API

### `storage.get(name: string): IBaseStorage`

Returns the storage instance for the given name. Throws if not found.

### DiskStorage Methods

The returned `IBaseStorage` instance supports typical file operations such as:

- `writeFile(filename: string, data: string | Buffer): Promise<void>`
- `readFile(filename: string): Promise<string | Buffer>`
- `deleteFile(filename: string): Promise<void>`
- `dispose(): Promise<void>`

## Notes

- Each storage instance is independent and configured via the main configuration file.
- The module is designed to be extensible for cloud or remote storage providers in the future.
