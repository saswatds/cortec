import type { IConfig } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { Db, MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';

export interface IMongoDb {
  db(name: string): Db;
  client(name: string): MongoClient;
}

export default class CortecMongoDb implements IModule, IMongoDb {
  name = 'mongodb';
  private clients: { [name: string]: MongoClient } = {};
  private dbs: { [name: string]: Db } = {};
  async load(ctx: IContext, sig: Sig) {
    const config = ctx.provide<IConfig>('config');
    const dbConfig = config?.get<any>(this.name);

    for (const identity in dbConfig) {
      const { connection, options } = dbConfig[identity],
        url = connection.password
          ? `mongodb://${connection.user}:${connection.password}@${connection.host}`
          : `mongodb://${connection.host}`;

      if (connection.ssl) {
        options.tlsCAFile = '/var/platform/rds-combined-ca-bundle.pem';
        options.tls = true;
        options.sslValidate = true;
      }

      // eslint-disable-next-line no-await-in-loop
      const client = await MongoClient.connect(
        url,
        options as MongoClientOptions
      );

      this.dbs[identity] = client.db(connection.database);
      this.clients[identity] = client;

      sig
        .scope(this.name, identity)
        .await('connecting to mongodb://' + connection.host);
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
}
