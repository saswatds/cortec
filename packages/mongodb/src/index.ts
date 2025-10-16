import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { Db, MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';

export interface IMongoDb {
  db(name: string): Db;
  client(name: string): MongoClient;
  healthCheck(): Promise<void>;
}

const DBConfigSchema = z.record(
  z.string(),
  z.object({
    connection: z.object({
      host: z.string(),
      database: z.string(),
      user: z.string(),
      password: z.string().optional(),
      ssl: z.boolean().optional(),
    }),
    options: z.record(z.any()),
  })
);

type DBConfig = z.infer<typeof DBConfigSchema>;

export default class CortecMongoDb implements IModule, IMongoDb {
  name = 'mongodb';

  protected dbConfig: DBConfig;
  private clients: { [name: string]: MongoClient } = {};
  private dbs: { [name: string]: Db } = {};

  constructor() {
    this.dbConfig = Config.get(this.name, DBConfigSchema);
  }

  async load(ctx: IContext, sig: Sig) {
    for (const [identity, instance] of Object.entries(this.dbConfig)) {
      const { connection, options } = instance,
        url = connection.password
          ? `mongodb://${connection.user}:${connection.password}@${connection.host}`
          : `mongodb://${connection.host}`;

      if (connection.ssl) {
        options['tlsCAFile'] = '/var/platform/rds-combined-ca-bundle.pem';
        options['tls'] = true;
        options['sslValidate'] = true;
      }

      sig
        .scope(this.name, identity)
        .await(
          'connecting to ' +
            (connection.password
              ? url.replace(connection.password, '********')
              : url)
        );

      // eslint-disable-next-line no-await-in-loop
      const client = await MongoClient.connect(
        url,
        options as MongoClientOptions
      );

      this.dbs[identity] = client.db(connection.database);
      this.clients[identity] = client;

      await client.db(connection.database).command({ ping: 1 });
      sig
        .scope(this.name, identity)
        .success('connected to mongodb://' + connection.host);
    }
  }
  async dispose() {
    await Promise.allSettled(
      [...Object.values(this.clients)].map((client) => client.close())
    );
  }

  db(name: string): Db {
    const db = this.dbs[name];
    if (!db) throw new Error(`No mongodb database '${name}' found`);

    return db;
  }

  client(name: string): MongoClient {
    const client = this.clients[name];
    if (!client) throw new Error(`No mongodb client with for ${name} found`);

    return client;
  }

  healthCheck(): Promise<void> {
    return Promise.all(
      Object.values(this.dbs).map((db) => db.command({ ping: 1 }))
    ).then(() => undefined);
  }
}
