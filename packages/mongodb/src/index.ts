import type { IConfig } from '@cortec/config';
import type { IContext, IModule } from '@cortec/types';
import type { Db, MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';
import type { TaskInnerAPI } from 'tasuku';

export default class CortecMongodb implements IModule {
  name = 'mongodb';
  private clients: { [name: string]: MongoClient } = {};
  private dbs: { [name: string]: Db } = {};
  async load(ctx: IContext, task: TaskInnerAPI) {
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

      // Health check for mongodb
      task.task(`connection check for ${identity}`, () =>
        client.db(connection.database).command({ ping: 1 })
      );
    }

    task.setTitle('MongoDB is ready');
  }
  async dispose() {
    [...Object.values(this.clients)].forEach((client) => client.close());
  }

  db(name: string): Db | undefined {
    return this.dbs[name];
  }

  client(name: string): MongoClient | undefined {
    return this.clients[name];
  }
}
