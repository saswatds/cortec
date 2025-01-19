import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import { readFileSync } from 'fs';
import { Pool } from 'pg';

const connectionSchema = z.object({
  user: z.string(),
  password: z.string(),
  host: z.string(),
  port: z.coerce.number(),
  database: z.string(),
  ssl: z
    .object({
      ca: z.string().optional(),
      key: z.string().optional(),
      cert: z.string().optional(),
      rejectUnauthorized: z.boolean(),
    })
    .optional(),
  statement_timeout: z.coerce.number().optional(),
  query_timeout: z.coerce.number().optional(),
  lock_timeout: z.coerce.number().optional(),
  connectionTimeoutMillis: z.coerce.number().optional(),
  idle_in_transaction_session_timeout: z.coerce.number().optional(),
  idleTimeoutMillis: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  allowExitOnIdle: z.boolean().optional(),
});

const schema = z.record(
  z.string(),
  z.object({
    connection: connectionSchema,
  })
);

type PostgresConfig = z.infer<typeof schema>;

export interface IPostgres {
  db(identity: string): Pool;
}

export default class CortecPostgres implements IModule, IPostgres {
  name = 'postgres';
  protected clients: { [identity: string]: Pool } = {};
  private config: PostgresConfig;

  constructor() {
    this.config = Config.get<PostgresConfig>(this.name, schema);
  }

  async load(ctx: IContext, sig: Sig) {
    for (const [identity, { connection }] of Object.entries(this.config)) {
      // Handle ssl
      if (connection.ssl) {
        if (connection.ssl.ca)
          connection.ssl.ca = readFileSync(connection.ssl.ca).toString();

        if (connection.ssl.key)
          connection.ssl.key = readFileSync(connection.ssl.key).toString();

        if (connection.ssl.cert)
          connection.ssl.cert = readFileSync(connection.ssl.cert).toString();
      }

      // Create the pool
      this.clients[identity] = new Pool(connection);

      sig
        .scope(this.name, identity)
        .await('connecting to postgres://' + connection.host);
      // Ping the database
      await this.clients[identity].query('SELECT 1');
      sig
        .scope(this.name, identity)
        .success('connected to postgres://' + connection.host);
    }
  }
  async dispose() {
    await Promise.allSettled(
      [...Object.values(this.clients)].map((client) => client.end())
    );
  }

  db(identity: string) {
    const client = this.clients[identity];
    if (!client) throw new Error(`No postgres database '${identity}' found`);
    return client;
  }
}
