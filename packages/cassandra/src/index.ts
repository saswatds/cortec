import type { IConfig } from '@cortec/config';
import type { IContext, IModule } from '@cortec/types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import sigV4 from 'aws-sigv4-auth-cassandra-plugin';
import { Client } from 'cassandra-driver';
import fs from 'fs';

export default class CortecCassandra implements IModule {
  name = 'cassandra';
  private clients: { [name: string]: Client } = {};
  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const dbConfig = config?.get<any>('cassandra');

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
          ca: [fs.readFileSync(options.caPath)],
          host: options.contactPoints[0],
          rejectUnauthorized: true,
        };
        client = new Client({ ...options, authProvider: auth, sslOptions });
      } else {
        client = new Client(options);
      }

      // eslint-disable-next-line no-await-in-loop
      await client.connect();

      this.clients[identity] = client;
    }
  }
  async dispose() {
    await Promise.allSettled(
      Object.values(this.clients).map((client) => client.shutdown())
    );
  }

  client(name: string): Client | undefined {
    return this.clients[name];
  }
}
