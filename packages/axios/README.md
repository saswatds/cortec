# @cortec/axios

## Module Overview

`@cortec/axios` provides a robust wrapper around [Axios](https://axios-http.com/) for making HTTP requests in Node.js applications. It supports service-based configuration, request tracing, automatic retries, error instrumentation with New Relic, and flexible request flags for controlling behavior.

This module is designed for use in service-oriented architectures, allowing you to define multiple external APIs ("services") in your configuration and access them by name.

---

## Configuration Options

**Where to put config:**
Place your Axios config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
axios:
  global:
    timeout: 5000 # Default timeout for all services (ms)
    headers:
      User-Agent: 'MyApp/1.0' # Default headers for all requests
  api:
    github:
      baseURL: 'https://api.github.com' # Base URL for the GitHub API
      headers:
        Authorization: 'Bearer <token>' # Auth header for GitHub
    myService:
      baseURL: 'https://myservice.example.com'
      timeout: 10000 # Override timeout for this service
```

**Field-by-field explanation:**

- `axios`: Root key for Axios config.
- `global`: (optional) Default [AxiosRequestConfig](https://axios-http.com/docs/req_config) applied to all services.
  - `timeout`: Default request timeout in milliseconds.
  - `headers`: Default headers for all requests.
  - Any other valid Axios config options.
- `api`: Map of service names to their individual Axios config.
  - Each key (e.g. `github`, `myService`) is a service name you will use in code.
  - `baseURL`: The base URL for the service.
  - `headers`: Service-specific headers.
  - `timeout`: Service-specific timeout.
  - Any other valid Axios config options.

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const axiosConfig = config?.get<any>('axios');
```

If config is missing or invalid, an error is thrown at startup.

**Usage in Axios module:**

- All services you want to use must be defined under `axios.api`.
- If a service is missing, an error will be thrown at runtime.
- You can override global config per service.
- New Relic integration and request flags are supported for advanced instrumentation.

---

## Example Usage

### Basic Usage

```ts
import Axios from '@cortec/axios';

// Define which services you want to use
const axiosModule = new Axios(['github', 'myService']);

// After context is loaded:
const github = axiosModule.service('github');
const response = await github.get('/users/octocat');
console.log(response.data);
```

### Using Request Flags

You can control request behavior using flags:

- `RequestFlags.None`: Default behavior
- `RequestFlags.Notice4XX`: Instrument/report 4XX errors to New Relic
- `RequestFlags.InstrumentUrl`: Add URL/method instrumentation to New Relic
- `RequestFlags.NoRetry`: Disable automatic retries

```ts
import { RequestFlags } from '@cortec/axios';

const myService = axiosModule.service('myService', RequestFlags.InstrumentUrl);
await myService.post('/endpoint', { foo: 'bar' });
```

### Tracing Requests

To propagate trace IDs for distributed tracing:

```ts
const traced = github.trace({ trace: { id: 'trace-id-123' } });
await traced.get('/repos');
```

---

## Features

- Service-based configuration for multiple APIs
- Automatic retry logic for failed requests (configurable)
- Error reporting and instrumentation with New Relic
- Distributed tracing support
- Strong TypeScript types

---

## Notes

- All services must be defined in your config under `axios.api`.
- If a service is missing, an error will be thrown at runtime.
- New Relic integration is optional but recommended for observability.

---

## License

MIT
