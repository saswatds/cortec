# @cortec/config

## Module Overview

`@cortec/config` provides configuration management for Cortec modules. It wraps the [`config`](https://www.npmjs.com/package/config) library and adds runtime schema validation using [`zod`](https://github.com/colinhacks/zod). This ensures that configuration values are present and correctly typed, with helpful error messages if validation fails.

The module exposes both a legacy interface (`CortecConfig`) and a static utility class (`Config`) for retrieving and validating configuration values.

## Configuration Options

Configuration is typically loaded from YAML files in your project's `config/` directory (e.g., `config/default.yml`). The structure and schema of each module's configuration is defined by that module.

The main API is:

```ts
Config.get<T>(path: string, schema?: z.Schema<T>): T
```

- `path`: The configuration key or path (e.g., `"redis"`, `"server.http"`).
- `schema`: A [zod](https://github.com/colinhacks/zod) schema describing the expected structure and types.

If the configuration is missing or invalid, an error is thrown with details.

## Example Usage

### Basic Usage

```ts
import { Config, z } from '@cortec/config';

// Define a schema for your config
const redisSchema = z.object({
  host: z.string(),
  port: z.number(),
  password: z.string().optional(),
});

// Retrieve and validate config
const redisConfig = Config.get('redis', redisSchema);

console.log(redisConfig.host, redisConfig.port);
```

### Handling Missing or Invalid Config

```ts
try {
  const serverConfig = Config.get(
    'server',
    z.object({
      http: z.object({
        port: z.number(),
      }),
    })
  );
  console.log('Server will run on port', serverConfig.http.port);
} catch (err) {
  console.error('Config error:', err.message);
}
```

### Listing Config Sources

```ts
const sources = Config.files();
console.log('Loaded config files:', sources);
```

## Legacy Interface

For backward compatibility, you can use the `CortecConfig` class:

```ts
import CortecConfig from '@cortec/config';

const config = new CortecConfig();
const value = config.get('some.path');
```

> **Note:** The legacy interface does not perform schema validation.

## Best Practices

- Always define and use a zod schema for your configuration to catch errors early.
- Organize your config files by environment (e.g., `default.yml`, `production.yml`).
- Use `Config.files()` to debug which config files are being loaded.

## References

- [config npm package](https://www.npmjs.com/package/config)
- [zod schema validation](https://github.com/colinhacks/zod)
