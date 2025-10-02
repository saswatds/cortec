# @cortec/bullmq

## Module Overview

`@cortec/bullmq` provides seamless integration with [BullMQ](https://docs.bullmq.io/) for managing distributed job queues, flows, and workers in Node.js applications. It leverages Redis as the backend for queue management and supports advanced configuration for concurrency, job options, and flow producers.

This module is designed to work within the Cortec framework, allowing you to define, configure, and operate multiple queues and workers with minimal boilerplate.

---

## Configuration Options

**Where to put config:**
Place your BullMQ config in `config/default.yml` (or your environment-specific config file).

**Schema:**

```yaml
bullmq:
  queue:
    jobs:
      cache: 'main'
      concurrency: 5
      options:
        attempts: 3
        backoff:
          type: 'exponential'
          delay: 1000
  producer:
    reports:
      cache: 'main'
      flow: true
```

**Field-by-field explanation:**

- `bullmq`: Root key for BullMQ config.
- `queue`: Map of queue names to queue config.
  - `cache`: Redis cache identity to use (must match a configured Redis instance).
  - `concurrency`: Number of concurrent jobs for the worker (integer, required).
  - `options`: [BullMQ job options](https://docs.bullmq.io/job-options) (object, optional).
    - `attempts`: Number of retry attempts for failed jobs (integer, optional).
    - `backoff`: Backoff strategy for retries (object, optional).
      - `type`: Backoff type, e.g. `"exponential"` or `"fixed"` (string).
      - `delay`: Delay in milliseconds between retries (integer).
- `producer`: Map of flow producer names to config.
  - `cache`: Redis cache identity.
  - `flow`: If true, enables flow producer (boolean, optional).

**How config is loaded:**
The config is loaded automatically by the `@cortec/config` module and validated at runtime.
Access it in code via:

```typescript
const config = ctx.provide<IConfig>('config');
const bullConfig = config?.get<any>('bullmq');
```

If config is missing or invalid, an error is thrown at startup.

**Example config:**

```yaml
bullmq:
  queue:
    jobs:
      cache: 'main'
      concurrency: 5
      options:
        attempts: 3
        backoff:
          type: 'exponential'
          delay: 1000
  producer:
    reports:
      cache: 'main'
      flow: true
```

---

## Example Usage

### 1. Registering BullMQ in Cortec

```ts
import CortecBullMQ from '@cortec/bullmq';

const bullmq = new CortecBullMQ({
  emailQueue: async (job) => {
    // Your job processing logic here
    console.log('Processing job:', job.data);
  },
});

// Add to Cortec context
ctx.use(bullmq);
await ctx.load();
```

### 2. Adding Jobs to a Queue

```ts
const queue = bullmq.queue('emailQueue');
await queue.add('sendEmail', { to: 'user@example.com', subject: 'Welcome!' });
```

### 3. Using Flow Producers

```ts
const flow = bullmq.flow('reportFlow');
await flow.add({
  name: 'generateReport',
  queueName: 'reportQueue',
  data: { reportId: 123 },
});
```

### 4. Accessing Workers

```ts
const worker = bullmq.worker('emailQueue');
// Worker is automatically started and processes jobs as per your handler
```

### 5. Graceful Shutdown

```ts
await bullmq.dispose();
```

---

## API Reference

- `queue(name: string): Queue` — Get a BullMQ queue instance by name.
- `flow(name: string): FlowProducer` — Get a BullMQ flow producer by name.
- `worker(name: string): Worker` — Get a BullMQ worker instance by name.
- `dispose(): Promise<void>` — Gracefully close all queues, flows, and workers.

---

## Notes

- Ensure you have a Redis instance configured and accessible as per your application's config.
- Worker handlers are provided as a map in the constructor, keyed by queue name.
- All configuration validation and error handling is performed at runtime.

For more advanced BullMQ features, refer to the [BullMQ documentation](https://docs.bullmq.io/).

---
