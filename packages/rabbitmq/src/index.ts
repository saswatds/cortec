import { Config, z } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { Channel, Connection } from 'amqplib';
import { connect } from 'amqplib';

const connectionSchema = z.object({
  protocol: z.enum(['amqp', 'amqps']),
  hostname: z.string(),
  port: z.coerce.number(),
  username: z.string(),
  password: z.string(),
});

const schema = z.record(
  z.string(),
  z.object({
    connection: connectionSchema,
  })
);

type RabbitMQConfig = z.infer<typeof schema>;

export interface IRabbitMQ {
  channel: (identity: string) => Channel;
}

export default class RabbitMQ implements IModule, IRabbitMQ {
  name = 'rabbitmq';
  private config: RabbitMQConfig;
  private $connections: { [identity: string]: Connection } = {};
  private $channel: { [identity: string]: Channel } = {};
  private $channel_prefetch: { [identity: string]: number } = {};
  private $consumers: {
    [identity: string]: Parameters<Channel['consume']>[];
  } = {};

  private nr: INewrelic | undefined;
  private isConnecting = false;
  constructor() {
    this.config = Config.get(this.name, schema);
  }

  async load(ctx: IContext, sig: Sig) {
    this.nr = ctx.provide('newrelic');

    for (const [identity, { connection }] of Object.entries(this.config)) {
      // Create the array for the consumers
      this.$consumers[identity] = [];

      // Connect to the rabbitmq server
      await this.connect(ctx, identity, connection, sig);
    }
  }

  channel(identity: string) {
    const channel = this.$channel[identity];
    if (!channel) throw new Error(`Channel ${identity} not found`);

    return new Proxy(channel, {
      get: (target, prop, receiver) => {
        // If the property being accesses is consumer or prefetch, return the value
        if (prop === 'prefetch') {
          return async (count: number, global?: boolean) => {
            // Cache the prefetch count
            this.$channel_prefetch[identity] = count;

            // Reflect the call to the original prefetch method
            return Reflect.apply(target.prefetch, target, [count, global]);
          };
        }

        if (prop === 'consume') {
          return async (...args: Parameters<Channel['consume']>) => {
            // Cache the consumer for this channel
            this.$consumers[identity]?.push(args);

            // Reflect the call to the original consume method
            return Reflect.apply(target.consume, target, args);
          };
        }

        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async dispose() {
    // Reset all the prefect count and consumers
    this.$channel_prefetch = {};
    this.$consumers = {};
    // close the publisher channel and the connection
    for (const identity in this.config) {
      await this.$channel[identity]?.close().catch(() => null);
      await this.$connections[identity]?.close().catch(() => null);
    }
  }

  private async connect(
    ctx: IContext,
    identity: string,
    connection: z.infer<typeof connectionSchema>,
    sig: Sig
  ) {
    // If already connecting, return
    if (this.isConnecting) {
      sig.scope(this.name, identity).warn(`already connecting`);
      return;
    }

    this.isConnecting = true;
    sig
      .scope(this.name, identity)
      .await(`connecting to ${connection.protocol}://${connection.hostname}`);
    const conn = await connect(connection);
    sig
      .scope(this.name, identity)
      .success(`connected to ${connection.protocol}://${connection.hostname}`);

    this.isConnecting = false;
    // Listen for connection close
    conn.on('close', (err) => {
      if (err) {
        // Track the error in newrelic if newrelic is available
        this.nr?.api.noticeError(err);

        sig
          .scope(this.name, identity)
          .error(
            `connection to ${connection.protocol}://${connection.hostname} closed with error: ${err.message}`
          );

        this.reconnect(ctx, identity, connection, sig).catch((err) => {
          // If it still results in an error. Restart the whole process
          this.nr?.api.noticeError(err);
          // Attempt to dispose the whole system
          sig
            .scope(this.name, identity)
            .error(
              `reconnection to ${connection.protocol}://${connection.hostname} failed with error: ${err.message}`
            );
          ctx.dispose(1);
        });
      }
    });

    // Listen for errors
    conn.on('error', (err) => {
      // Track the error in newrelic if newrelic is available
      this.nr?.api.noticeError(err);

      // Attempt to reconnect
      this.reconnect(ctx, identity, connection, sig).catch((err) => {
        // If it still results in an error. Restart the whole process
        this.nr?.api.noticeError(err);
        // Attempt to dispose the whole system
        sig
          .scope(this.name, identity)
          .error(
            `reconnection to ${connection.protocol}://${connection.hostname} failed with error: ${err.message}`
          );
        ctx.dispose(1);
      });
    });

    // Persist the connection
    this.$connections[identity] = conn;

    await this.createChannel(ctx, identity, conn, sig);
  }

  private async reconnect(
    ctx: IContext,
    identity: string,
    connection: z.infer<typeof connectionSchema>,
    sig: Sig
  ) {
    sig
      .scope(this.name, identity)
      .await(`reconnecting to ${connection.protocol}://${connection.hostname}`);

    // Remove the current connection/channel listeners
    this.cleanChannel(identity);
    this.cleanConnection(identity);

    // Attempt to connection again
    await this.connect(ctx, identity, connection, sig);
  }

  private async createChannel(
    ctx: IContext,
    identity: string,
    connection: Connection,
    sig: Sig
  ) {
    const channel = await connection.createChannel();

    sig.scope(this.name, identity).success(`channel created`);

    // create a channel for publishing messages
    this.$channel[identity] = channel;

    // Listen for channel close
    channel.on('close', () => {
      sig.scope(this.name, identity).error(`channel closed`);
      this.cleanChannel(identity);
    });

    channel.on('error', (err) => {
      // Track the error in newrelic if newrelic is available
      this.nr?.api.noticeError(err);

      // Clean the existing channel if it exists
      this.cleanChannel(identity);

      // Attempt to create the channel again
      this.createChannel(ctx, identity, connection, sig).catch((err) => {
        // If it still results in an error. Restart the whole process
        this.nr?.api.noticeError(err);
        // Attempt to dispose the whole system
        ctx.dispose(1);
      });
    });

    // Set the prefetch count if it exists
    const prefetch = this.$channel_prefetch[identity];
    if (prefetch) {
      await channel.prefetch(prefetch);
      sig
        .scope(this.name, identity)
        .success(`setting prefetch count to ${prefetch}`);
    }

    const consumers = this.$consumers[identity];
    // Add the consumers to the channel if they exist
    if (consumers) {
      // Add the consumers back to the channel
      for (const consumer of consumers) {
        await channel.consume(...consumer);
        sig
          .scope(this.name, identity)
          .success(`re-subscribing consumer to queue '${consumer[0]}'`);
      }
    }
  }

  private cleanConnection(identity: string) {
    this.$connections[identity]?.removeAllListeners();
    delete this.$connections[identity];
  }

  private cleanChannel(identity: string) {
    this.$channel[identity]?.removeAllListeners();
    delete this.$channel[identity];
  }
}
