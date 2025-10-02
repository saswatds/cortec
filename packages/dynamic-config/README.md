# @cortec/dynamic-config

## Module Overview

`@cortec/dynamic-config` provides a mechanism for managing configuration values that can be updated at runtime and stored in a backing store (such as MongoDB). It supports schema validation, periodic refresh, and safe updates, making it ideal for feature flags, runtime tunables, and other dynamic settings.

## Configuration Options

The configuration for dynamic-config is defined using a Zod schema and typically looks like this:

```ts
{
  source: {
    type: string; // e.g., 'mongodb'
    mongodb: {
      name: string;       // MongoDB database name
      collection: string; // MongoDB collection name
    }
  },
  ttl?: number;           // Optional: refresh interval in milliseconds
  default: any;           // Default config value (validated by schema)
}
```

Example YAML configuration:

```yaml
dynamic-config:
  source:
    type: mongodb
    mongodb:
      name: mydb
      collection: configCollection
  ttl: 300000 # 5 minutes
  default:
    featureEnabled: false
    maxLimit: 100
```

## Example Usage

```ts
import { z } from '@cortec/config';
import DynamicConfig from '@cortec/dynamic-config';

// Define your config schema
const configSchema = z.object({
  featureEnabled: z.boolean(),
  maxLimit: z.number(),
});

// Instantiate the dynamic config module
const dynConfig = new DynamicConfig(configSchema, 'myFeature');

// After context is loaded, access config values:
const currentConfig = dynConfig.config;

// Refresh config from MongoDB
await dynConfig.refresh();

// Update config in MongoDB
await dynConfig.update({ featureEnabled: true, maxLimit: 200 }, 60000);
```

## Features

- **Schema Validation:** Ensures config values conform to your schema.
- **MongoDB Backing:** Stores and retrieves config from a MongoDB collection.
- **Automatic Refresh:** Periodically refreshes config based on TTL.
- **Safe Updates:** Validates before updating config in the backing store.

## API

- `config`: Returns the current config value (with fallback to default).
- `refresh()`: Fetches the latest config from the backing store.
- `update(config, ttl?)`: Updates the config in the backing store and sets a new TTL.

---

For more advanced usage, see the source code or extend the schema to fit your needs.
