import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import { Client } from '@elastic/elasticsearch';
import fs from 'fs';

const connectionSchema = z.object({
  user: z.string(),
  password: z.string(),
  host: z.string(),
  port: z.coerce.number(),
  caFile: z.string(),
});
const configSchema = z.record(
  z.string(),
  z.object({
    connection: connectionSchema,
  })
);

type ElasticConfig = z.infer<typeof configSchema>;

export interface IElastic {
  client: (identity: string) => Client;
}

type ClientConfig = {
  node: string;
  auth: {
    username: string;
    password: string;
  };
  ssl?: {
    ca: any;
  };
};

export class Elastic implements IModule, IElastic {
  name = 'elastic';
  protected clients: { [identity: string]: Client } = {};
  private config: ElasticConfig;

  constructor() {
    this.config = Config.get<ElasticConfig>('elastic', configSchema);
  }

  async load(_: IContext, sig: Sig): Promise<void> {
    for (const [identity, { connection }] of Object.entries(this.config)) {
      const node = `${connection.host}:${connection.port}`;
      const clientConfig: ClientConfig = {
        node,
        auth: {
          username: connection.user,
          password: connection.password,
        },
      };

      if (connection.caFile) {
        clientConfig.ssl = {
          ca: fs.readFileSync(connection.caFile),
        };
      }
      const client = new Client(clientConfig);

      sig.scope(this.name, identity).await(`connecting to ${node}`);

      const healthy = client.ping();
      if (!healthy) {
        throw new Error(`failed to connect to ${node}`);
      }

      sig.scope(this.name, identity).info(`connected to ${node}`);

      this.clients[identity] = client;
    }
  }

  async dispose(): Promise<void> {
    await Promise.all(
      Object.values(this.clients).map((client) => client.close())
    );
  }

  client(identity: string): Client {
    const client = this.clients[identity];
    if (!client) {
      throw new Error(`client ${identity} not found`);
    }

    return client;
  }
}
