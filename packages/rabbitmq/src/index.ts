import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { Channel, Connection } from 'amqplib';
import { connect } from 'amqplib';

const schema = z.record(
  z.string(),
  z.object({
    connection: z.object({
      protocol: z.enum(['amqp', 'amqps']),
      hostname: z.string(),
      port: z.coerce.number(),
      username: z.string(),
      password: z.string(),
    }),
  })
);

type RabbitMQConfig = z.infer<typeof schema>;

export interface IRabbitMQ {
  publish: (identity: string, queue: string, message: string) => void;
}

export default class RabbitMQ implements IModule, IRabbitMQ {
  name = 'rabbitmq';
  private config: RabbitMQConfig;
  private connections: { [identity: string]: Connection } = {};
  private channel: { [identity: string]: Channel } = {};
  constructor() {
    this.config = Config.get(this.name, schema);
  }

  async load(_ctx: IContext, sig: Sig) {
    for (const [identity, { connection }] of Object.entries(this.config)) {
      sig
        .scope(this.name, identity)
        .await('connecting to amqp://' + connection.hostname);
      const conn = await connect(connection);
      sig
        .scope(this.name, identity)
        .success('connected to amqp://' + connection.hostname);

      this.connections[identity] = conn;
      // create a channel for publishing messages
      this.channel[identity] = await conn.createChannel();
    }
  }

  async publish(identity: string, queue: string, message: string) {
    this.channel[identity]?.sendToQueue(queue, Buffer.from(message));
  }

  async dispose() {
    // close the publisher channel and the connection
    for (const identity in this.config) {
      await this.channel[identity]?.close();
      await this.connections[identity]?.close();
    }
  }
}
