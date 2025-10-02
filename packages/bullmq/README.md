# @cortec/bullmq

## Module Overview

`@cortec/bullmq` provides seamless integration with [BullMQ](https://docs.bullmq.io/) for managing distributed job queues, flows, and workers in Node.js applications. It leverages Redis as the backend for queue management and supports advanced configuration for concurrency, job options, and flow producers.

This module is designed to work within the Cortec framework, allowing you to define, configure, and operate multiple queues and workers with minimal boilerplate.

---

## Configuration Options

Configuration for BullMQ is typically provided via your application's config system under the `bullmq` key. Below is the structure and explanation of the available options:

```ts
interface BullConfig {
  cache: string; // Name of the Redis cache instance to use
  concurrency: number; // Number of concurrent jobs the worker can process
  flow?: boolean; // Enable flow producer for complex job flows
  options?: DefaultJobOptions; // BullMQ job options (e.g., attempts, backoff, etc.)
}

interface BullMQConfig {
  queue?: { [name: string]: BullConfig };
  producer?: { [name: string]: BullConfig };
}
```

**Example config:**

```yaml
bullmq:
  queue:
    emailQueue:
      cache: 'main'
      concurrency: 5
      options:
        attempts: 3
        backoff:
          type: 'exponential'
          delay: 1000
  producer:
    reportFlow:
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
