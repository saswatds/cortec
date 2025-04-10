import { Config, z } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { Channel, Connection, Replies } from 'amqplib';
import { connect } from 'amqplib';
import retry from 'async-retry';

const connectionConfig = z.object({
  protocol: z.enum(['amqp', 'amqps']),
  hostname: z.string(),
  port: z.coerce.number(),
  username: z.string(),
  password: z.string(),
});

const schema = z.record(
  z.string(),
  z.object({
    connection: connectionConfig,
  })
);

type RabbitMQConfig = z.infer<typeof schema>;

export interface IRabbitMQ {
  channel: (identity: string) => RabbitMQChannel;
}

export type IRabbitMQConsumer = (message: string) => Promise<void>;
export class RabbitRejectError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class RabbitMQChannel {
  private channel: Channel | undefined;
  private buffer: [string, string][] = [];
  private consumers: {
    [queue: string]: { fn: IRabbitMQConsumer; prefetch: number | undefined };
  } = {};
  private bindedConsumers: { [queue: string]: Replies.Consume } = {};
  constructor(
    private sig: Sig,
    private nr: INewrelic | undefined,
    private bufferSize: number = 1000
  ) {}

  sendToQueue(queue: string, message: string) {
    if (!this.channel) {
      // If the channel is not yet created, then we need to buffer the message until the channel is created
      // Note: We should store at most 100 messages in the buffer to avoid memory issues
      this.buffer.push([queue, message]);

      if (this.buffer.length > this.bufferSize) {
        this.sig?.error(
          `buffer overflow. dropping message for queue: ${queue}`
        );
        this.nr?.api.noticeError(
          new Error(`rabbitmq query ${queue} buffer overflow`)
        );
      }
      return;
    }

    this.channel.sendToQueue(queue, Buffer.from(message));
  }

  consume(
    queue: string,
    prefetch: number | undefined,
    consumer: IRabbitMQConsumer
  ) {
    // If the consumer is already bound to the queue, then reject the request
    if (this.consumers[queue]) {
      this.sig?.error(`consumer already bound to queue: ${queue}`);
      throw new Error(`consumer already bound to queue: ${queue}`);
    }

    this.consumers[queue] = { fn: consumer, prefetch };

    // Bind the consumer to the queue
    this.bindConsumers();
  }

  async create(connection: Connection) {
    const channel = await connection.createChannel();

    this.sig?.success(`channel created`);

    // create a channel for publishing messages
    this.channel = channel;

    if (this.buffer.length > 0) {
      this.sig?.info(`sending ${this.buffer.length} buffered messages`);
      // Send all buffered messages
      for (const [queue, message] of this.buffer) {
        this.channel.sendToQueue(queue, Buffer.from(message));
      }

      // Clear the buffer
      this.buffer = [];
    }

    // Bind the consumers
    this.bindConsumers();

    // Listen for channel close
    channel.once('close', () => {
      this.sig?.error(`channel closed`);
    });

    channel.once('error', (err) => {
      this.sig?.error(`channel error: ${err.message}`);
      // Track the error in newrelic if newrelic is available
      this.nr?.api.noticeError(err);
    });
  }

  reset() {
    this.sig?.info(`resetting channel`);
    this.channel?.removeAllListeners();
    this.channel = undefined;
    this.bindedConsumers = {};
  }

  dispose() {
    this.sig?.info(`disposing channel`);
    this.channel?.removeAllListeners();

    // Unbind all consumers
    for (const queue of Object.values(this.bindedConsumers)) {
      this.channel?.cancel(queue.consumerTag);
    }

    this.bindedConsumers = {};
    this.consumers = {};
    this.channel = undefined;
  }

  private async bindConsumers() {
    // If the channel is not yet created then ignore the request
    if (!this.channel) return;
    // Check if we already have a consumer for the queue
    for (const [queue, { prefetch }] of Object.entries(this.consumers)) {
      // Check if we already have a consumer for the queue
      if (this.bindedConsumers[queue]) continue;

      this.sig?.info(`binding consumer to queue: ${queue}`);

      // Set the prefetch
      if (prefetch) await this.channel.prefetch(prefetch);

      // Bind the consumer to the queue
      this.bindedConsumers[queue] = await this.channel.consume(queue, (msg) => {
        if (!msg) return;
        // Get the consumer again to ensure that the consumer is still bound to the queue
        const consumer = this.consumers[queue];

        if (!consumer) return;

        // Call the consumer
        consumer
          .fn(msg.content.toString())
          .then(() => {
            this.channel?.ack(msg);
          })
          .catch((err) => {
            if (err instanceof RabbitRejectError) {
              this.channel?.nack(msg, false, false);
            } else {
              this.nr?.api.noticeError(err);
              this.channel?.nack(msg, false, true);
            }
          });
      });
    }
  }
}

export default class RabbitMQ implements IModule, IRabbitMQ {
  name = 'rabbitmq';
  private config: RabbitMQConfig;
  private $connections: { [identity: string]: Connection } = {};
  private $channel: { [identity: string]: RabbitMQChannel } = {};

  private sig: Sig | undefined;
  private nr: INewrelic | undefined;
  constructor() {
    this.config = Config.get(this.name, schema);
  }

  async load(ctx: IContext, sig: Sig) {
    const nr = ctx.provide<INewrelic>('newrelic');
    this.sig = sig;
    this.nr = nr;

    for (const [identity, { connection }] of Object.entries(this.config)) {
      // Create a new channel for each identity
      const channel = new RabbitMQChannel(sig.scope(this.name, identity), nr);
      this.$channel[identity] = channel;
      // Connect to the rabbitmq server
      await this.connect(ctx, identity, connection, channel);
    }
  }

  channel(identity: string) {
    const channel = this.$channel[identity];
    if (!channel) throw new Error(`Channel ${identity} not found`);

    return channel;
  }

  async dispose() {
    // Dispose all channels
    for (const channel of Object.values(this.$channel)) {
      channel.dispose();
    }

    // close the publisher channel and the connection
    for (const identity in this.config) {
      const conn = this.$connections[identity];
      if (!conn) continue;

      // Remove all listeners from the connection
      conn.removeAllListeners();

      // Close the connection
      await conn.close().catch(() => null);
    }
  }

  private async connect(
    ctx: IContext,
    identity: string,
    connection: z.infer<typeof connectionConfig>,
    channel: RabbitMQChannel
  ) {
    this.sig
      ?.scope(this.name, identity)
      .await(`connecting to ${connection.protocol}://${connection.hostname}`);
    const conn = await connect(connection);
    this.sig
      ?.scope(this.name, identity)
      .success(`connected to ${connection.protocol}://${connection.hostname}`);

    /**
     * Emitted once the closing handshake initiated by #close() has completed; or,
     * if server closed the connection, once the client has sent the closing handshake; or,
     * if the underlying stream (e.g., socket) has closed.
     *
     * In the case of a server-initiated shutdown or an error,
     * the 'close' handler will be supplied with an error indicating the cause.
     */
    conn.once('close', (err) => {
      if (err) {
        this.nr?.api.noticeError(err);
        this.sig
          ?.scope(this.name, identity)
          .error(
            `connection to ${connection.protocol}://${connection.hostname} closed with error: ${err.message}`
          );
      } else {
        this.sig
          ?.scope(this.name, identity)
          .success(
            `connection to ${connection.protocol}://${connection.hostname} closed`
          );
      }

      // Attempt to reconnect to the server
      this.reconnect(ctx, identity, connection, channel);
    });

    // Persist the connection
    this.$connections[identity] = conn;

    this.channel(identity).create(conn);
  }

  private async reconnect(
    ctx: IContext,
    identity: string,
    connection: z.infer<typeof connectionConfig>,
    channel: RabbitMQChannel
  ) {
    this.sig
      ?.scope(this.name, identity)
      .await(`reconnecting to ${connection.protocol}://${connection.hostname}`);

    // Remove the existing connection from the list and remove any listeners
    // attached to it
    this.removeConnection(identity);

    // We will attempt to connect again until we get a successful connection again
    await retry(() => this.connect(ctx, identity, connection, channel), {
      onRetry: (err: any, attemptNumber) => {
        this.sig
          ?.scope(this.name, identity)
          .error(
            `failed to connect to ${connection.protocol}://${connection.hostname} with error: ${err.message} (attempt ${attemptNumber})`
          );
      },
    }).catch((err: any) => {
      this.sig
        ?.scope(this.name, identity)
        .error(
          `failed to connect to ${connection.protocol}://${connection.hostname} with error: ${err.message}`
        );
      this.nr?.api.noticeError(err);
      ctx.dispose(1);
    });
  }

  private removeConnection(identity: string) {
    // Reset the channel
    this.channel(identity).reset();
    // Remove all listeners from the connection
    this.$connections[identity]?.removeAllListeners();
    // Remove the connection from the list
    delete this.$connections[identity];
  }
}
