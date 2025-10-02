# @cortec/axios

## Module Overview

`@cortec/axios` provides a robust wrapper around [Axios](https://axios-http.com/) for making HTTP requests in Node.js applications. It supports service-based configuration, request tracing, automatic retries, error instrumentation with New Relic, and flexible request flags for controlling behavior.

This module is designed for use in service-oriented architectures, allowing you to define multiple external APIs ("services") in your configuration and access them by name.

---

## Configuration Options

Configuration is provided via your config system under the `axios` key. The structure is:

```ts
interface IAxiosConfig {
  global?: AxiosRequestConfig; // Default options for all services
  api: {
    [serviceName: string]: AxiosRequestConfig; // Options per service
  };
}
```

**Example config:**

```yaml
axios:
  global:
    timeout: 5000
    headers:
      User-Agent: 'MyApp/1.0'
  api:
    github:
      baseURL: 'https://api.github.com'
      headers:
        Authorization: 'Bearer <token>'
    myService:
      baseURL: 'https://myservice.example.com'
      timeout: 10000
```

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
