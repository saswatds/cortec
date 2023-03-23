import type { Ctx, OnExit } from '@cortec/types';
import config from 'config';
import type { Db, MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';

export default async function (ctx: Ctx): Promise<OnExit> {
  const dbConfig = config.util.toObject(config.get('mongo')),
    db: { [name: string]: Db } = {},
    cli: { [name: string]: MongoClient } = {};

  // eslint-disable-next-line no-restricted-syntax, guard-for-in
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

    db[identity] = client.db(connection.database);
    cli[identity] = client;
  }

  // Set the db context with a getter function
  ctx.set('mongo', (name: string) => db[name]);
  ctx.set('_mongo', (name: string) => cli[name]);

  return (next) => {
    [...Object.values(cli)].forEach((client) => client.close());
    next();
  };
}
