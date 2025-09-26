import { Config, z } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { Channel, Connection, Replies } from 'amqplib';
import { connect } from 'amqplib';
import retry from 'async-retry';

const connectionConfig = z.object({
  protocol: z.enum(['amqp', 'amqps']),
  hostname: z.string().min(1, 'hostname cannot be empty'),
  port: z.coerce.number(),
  username: z.string().min(1, 'username cannot be empty'),
  password: z.string().min(1, 'password cannot be empty'),
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
    [queue: string]: IRabbitMQConsumer;
  } = {};
  private boundConsumers: { [queue: string]: Replies.Consume } = {};
  private $prefetch: number | undefined;
  constructor(
    private sig: Sig,
    private nr: INewrelic | undefined,
    private bufferSize: number = 1000
  ) {}

  /**
   * Get the channel for internal use
   */
  get $channel() {
    return this.channel;
  }

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

    const sent = this.channel.sendToQueue(queue, Buffer.from(message));

    if (!sent) {
      this.sig?.error(`failed to send message to queue: ${queue}`);
      this.nr?.api.noticeError(
        new Error(`rabbitmq query ${queue} sendToQueue failed`)
      );
    }
  }

  consume(queue: string, consumer: IRabbitMQConsumer) {
    // If the consumer is already bound to the queue, then reject the request
    if (this.consumers[queue]) {
      this.sig?.error(`consumer already bound to queue: ${queue}`);
      throw new Error(`consumer already bound to queue: ${queue}`);
    }

    this.consumers[queue] = consumer;

    // Bind the consumer to the queue
    this.bindConsumers();
  }

  async create(connection: Connection) {
    const channel = await connection.createChannel();

    this.sig?.success(`channel created`);

    // Set the prefetch
    if (this.$prefetch)
      await channel.prefetch(this.$prefetch).catch((err) => {
        this.sig?.error(`failed to set prefetch: ${err.message}`);
        this.nr?.api.noticeError(err);
      });

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
    this.boundConsumers = {};
  }

  dispose() {
    this.sig?.info(`disposing channel`);
    this.channel?.removeAllListeners();

    // Unbind all consumers
    for (const queue of Object.values(this.boundConsumers)) {
      this.channel?.cancel(queue.consumerTag);
    }

    this.boundConsumers = {};
    this.consumers = {};
    this.channel = undefined;
  }

  prefetch(prefetch: number) {
    this.$prefetch = prefetch;
    // If the channel is already created, then set the prefetch
    this.channel?.prefetch(prefetch).catch((err) => {
      this.sig?.error(`failed to set prefetch: ${err.message}`);
      this.nr?.api.noticeError(err);
    });
  }

  private async bindConsumers() {
    // If the channel is not yet created then ignore the request
    if (!this.channel) return;
    // Check if we already have a consumer for the queue
    for (const queue of Object.keys(this.consumers)) {
      // Check if we already have a consumer for the queue
      if (this.boundConsumers[queue]) continue;

      this.sig?.info(`binding consumer to queue: ${queue}`);

      // Bind the consumer to the queue
      this.boundConsumers[queue] = await this.channel.consume(queue, (msg) => {
        if (!msg) return;
        // Get the consumer again to ensure that the consumer is still bound to the queue
        const consumer = this.consumers[queue];

        if (!consumer) return;

        // Call the consumer
        consumer(msg.content.toString())
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

const maskPassword = (str: string, charsToShow = 2) => {
  // Mask the password except the last charsToShow characters
  // If password is less than charsToShow characters, then show the entire password
  // Example: password -> ********rd
  if (str.length <= charsToShow) return str;
  return '*'.repeat(str.length - charsToShow) + str.slice(-charsToShow);
};

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
      .await(
        `connecting to ${connection.protocol}://${
          connection.hostname
        } with user ${connection.username} and password ${maskPassword(
          connection.password
        )}`
      );
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

    await this.channel(identity).create(conn);
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
