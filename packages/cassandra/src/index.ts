import type { Cb, Ctx, Exit } from '@cortec/types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import sigV4 from 'aws-sigv4-auth-cassandra-plugin';
import { Client } from 'cassandra-driver';
import config from 'config';
import fs from 'fs';

export default function (ctx: Ctx, exit: Exit, done: Cb) {
  const dbConfig = config.util.toObject(config.get('cassandra')),
    db: { [name: string]: Client } = {};

  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const identity in dbConfig) {
    const { auth, options } = dbConfig[identity];

    let client: Client;
    if (auth === 'aws') {
      // Note: This will pick up credentials that have been put by vulcan
      const auth = new sigV4.SigV4AuthProvider({
        region: 'us-east-1',
      });

      const sslOptions = {
        ca: [fs.readFileSync('./.cassandra/sf-class2-root.crt')],
        host: options.contactPoints[0],
        rejectUnauthorized: true,
      };
      client = new Client({ ...options, authProvider: auth, sslOptions });
    } else {
      client = new Client(options);
    }

    db[identity] = client;
  }

  // Set the db context with a getter function
  ctx.set('cassandra', (name: string) => db[name]);

  done(undefined, (next) => {
    [...Object.values(db)].forEach((client) => client.shutdown());
    next();
  });
}
