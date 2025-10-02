import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import { Client } from '@opensearch-project/opensearch';
import fs from 'fs';

const connectionSchema = z.object({
  enabled: z.boolean(),
  user: z.string(),
  password: z.string(),
  host: z.string(),
  port: z.coerce.number(),
  caFile: z.string().optional(),
});
const configSchema = z.record(
  z.string(),
  z.object({
    connection: connectionSchema,
  })
);

type OpensearchConfig = z.infer<typeof configSchema>;

type ClientConfig = {
  node: string;
  auth: {
    username: string;
    password: string;
  };
  ssl?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ca: any;
  };
};

export interface IOpensearch {
  client: (identity: string) => Client;
}

export default class Opensearch implements IOpensearch, IModule {
  name = 'opensearch';
  protected clients: { [identity: string]: Client } = {};
  private config: OpensearchConfig;

  constructor() {
    this.config = Config.get<OpensearchConfig>('opensearch', configSchema);
  }

  async load(_: IContext, sig: Sig): Promise<void> {
    for (const [identity, { connection }] of Object.entries(this.config)) {
      if (!connection.enabled) {
        sig
          .scope(this.name, identity)
          .info(
            `skipping client instantiation for ${identity}: enabled flag is false`
          );
        continue;
      }

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

      const healthy = await client.ping();
      if (!healthy.body) {
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
