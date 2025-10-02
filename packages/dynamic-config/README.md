# @cortec/dynamic-config

## Module Overview

`@cortec/dynamic-config` provides a mechanism for managing configuration values that can be updated at runtime and stored in a backing store (such as MongoDB). It supports schema validation, periodic refresh, and safe updates, making it ideal for feature flags, runtime tunables, and other dynamic settings.

## Configuration Options

**Where to put config:**
Place your dynamic config in `config/default.yml` (or your environment-specific config file).

**Schema/Structure:**

```yaml
dynamic-config:
  source:
    type: mongodb # Source type, currently only 'mongodb' is supported
    mongodb:
      name: mydb # MongoDB database name
      collection: configCollection # MongoDB collection name for configs
  ttl: 300000 # Optional: refresh interval in milliseconds (default: 5 minutes)
  default:
    featureEnabled: false # Default config values (validated by your schema)
    maxLimit: 100
```

**Field-by-field explanation:**

- `dynamic-config`: Root key for dynamic config.
- `source`: Specifies where to load config from.
  - `type`: Source type. Only `"mongodb"` is supported.
  - `mongodb`: MongoDB connection details.
    - `name`: The identity/name of the MongoDB instance (must match your MongoDB config).
    - `collection`: The collection in MongoDB where configs are stored.
- `ttl`: (Optional) How often to refresh config from the source, in milliseconds. Default is 5 minutes.
- `default`: The default config object, validated by your Zod schema. Used as fallback if no config is found in the source.

**Example YAML configuration:**

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

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime using your Zod schema.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const dynConfig = config?.get<any>('dynamic-config');
```

If config is missing or invalid, an error is thrown at startup. The module will periodically refresh config from MongoDB based on the `ttl` value, and you can manually call `refresh()` or `update()` as needed.

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
