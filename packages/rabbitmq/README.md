# @cortec/rabbitmq

## Module Overview

`@cortec/rabbitmq` provides a robust integration with RabbitMQ for message queueing, publishing, and consuming. It supports multiple connections, automatic reconnection, error tracking with NewRelic, and consumer buffering. The module is designed to work seamlessly within the Cortec context and supports advanced features like prefetch control and custom error handling.

## Configuration Options

Configuration is provided via your config files (e.g., `config/default.yml`) under the `rabbitmq` key. Each connection is defined by an identity and must specify connection details.

```yaml
rabbitmq:
  myQueue:
    connection:
      protocol: amqp # or amqps
      hostname: localhost # RabbitMQ server host
      port: 5672 # RabbitMQ server port
      username: guest # Username for authentication
      password: guest # Password for authentication
```

**Schema:**

- `protocol`: `"amqp"` or `"amqps"`
- `hostname`: RabbitMQ server hostname
- `port`: RabbitMQ server port (number)
- `username`: Username for authentication
- `password`: Password for authentication

## Example Usage

### 1. Creating and Using a Channel

```ts
import RabbitMQ from '@cortec/rabbitmq';

// Instantiate the module (usually handled by Cortec context)
const rabbitmq = new RabbitMQ();

// After context is loaded:
const channel = rabbitmq.channel('myQueue');

// Send a message to a queue
channel.sendToQueue(
  'jobs',
  JSON.stringify({ type: 'process', payload: { id: 123 } })
);

// Consume messages from a queue
channel.consume('jobs', async (message) => {
  const job = JSON.parse(message);
  // Process job...
  await doWork(job);
});
```

### 2. Handling Consumer Errors

If your consumer throws a `RabbitRejectError`, the message will be nacked and not requeued. Other errors are tracked in NewRelic (if available) and the message is nacked and requeued.

```ts
import { RabbitRejectError } from '@cortec/rabbitmq';

channel.consume('jobs', async (message) => {
  try {
    // ...process message
  } catch (err) {
    if (shouldNotRequeue(err)) {
      throw new RabbitRejectError('Do not requeue this message');
    }
    throw err;
  }
});
```

### 3. Prefetch Control

You can set the prefetch count for a channel to control how many messages are fetched at once.

```ts
channel.prefetch(10); // Fetch up to 10 messages at a time
```

## Features

- Multiple RabbitMQ connections by identity
- Automatic reconnection on connection loss
- Consumer buffering and error handling
- Integration with NewRelic for error tracking
- Prefetch control for consumers
- Masked password logging for security

## Health & Disposal

The module handles connection disposal and consumer unbinding automatically when the context is disposed.

---

For more advanced usage, refer to the implementation in `src/index.ts` and the configuration schema in your config files.
