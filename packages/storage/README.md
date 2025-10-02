# @cortec/storage

## Module Overview

The `@cortec/storage` package provides a unified interface for managing file storage backends. It currently supports disk-based storage and is designed to be extensible for other storage providers. The module allows you to configure multiple storage instances, each with its own directory and options, and access them by name.

## Configuration Options

The configuration for storage is defined as a record of storage identities, each specifying a directory and whether to create parent directories if they do not exist.

```ts
{
  [identity: string]: {
    dir: string;        // Directory path for storage
    makeParent: boolean;// If true, create parent directories if missing
  }
}
```

Example configuration in your config file:

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
