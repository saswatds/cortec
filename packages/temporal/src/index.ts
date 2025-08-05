import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Config, z } from '@cortec/config';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { TLSConfig } from '@temporalio/client';
import { Connection } from '@temporalio/client';
import { NativeConnection } from '@temporalio/worker';
import fs from 'fs';

const ConnectionSchema = z.object({
  address: z.string(),
  tls: z.discriminatedUnion('source', [
    z.object({
      source: z.literal('filesystem'),
      paths: z.object({
        ca: z.string().optional(),
        cert: z.string(),
        key: z.string(),
      }),
    }),
    z.object({
      source: z.literal('s3'),
      region: z.string(),
      bucket: z.string(),
      paths: z.object({
        ca: z.string().optional(),
        cert: z.string(),
        key: z.string(),
      }),
    }),
  ]),
});

const ConfigSchema = z.object({
  workers: z.record(ConnectionSchema),
  clients: z.record(ConnectionSchema),
});

type TemporalConfig = z.infer<typeof ConfigSchema>;

export interface ITemporal {
  client: (identity: string) => Connection;
  worker: (identity: string) => NativeConnection;
}

export default class Temporal implements IModule, ITemporal {
  name = 'temporal';
  protected clients: { [identity: string]: Connection } = {};
  protected workers: { [identity: string]: NativeConnection } = {};
  private config: TemporalConfig;

  constructor() {
    this.config = Config.get<TemporalConfig>('temporal', ConfigSchema);
  }

  async load(_: IContext, sig: Sig): Promise<void> {
    for (const [identity, { address, tls }] of Object.entries(
      this.config.workers
    )) {
      const tlsConfig = await this.getTLSConfig(
        tls,
        sig.scope(this.name + ':worker', identity)
      );
      const worker = await NativeConnection.connect({
        address,
        tls: tlsConfig,
      });

      sig
        .scope(this.name + ':worker', identity)
        .success(`connected to ${address}`);

      this.workers[identity] = worker;
    }

    for (const [identity, { address, tls }] of Object.entries(
      this.config.clients
    )) {
      const tlsConfig = await this.getTLSConfig(
        tls,
        sig.scope(this.name + ':client', identity)
      );
      const client = await Connection.connect({ address, tls: tlsConfig });

      sig
        .scope(this.name + ':client', identity)
        .success(`connected to ${address}`);

      this.clients[identity] = client;
    }
  }

  async dispose(): Promise<void> {
    await Promise.all(
      Object.values(this.clients).map((client) => client.close())
    );

    await Promise.all(
      Object.values(this.workers).map((worker) => worker.close())
    );
  }

  client(identity: string): Connection {
    const client = this.clients[identity];
    if (!client) {
      throw new Error(`client ${identity} not found`);
    }

    return client;
  }

  worker(identity: string): NativeConnection {
    const worker = this.workers[identity];
    if (!worker) {
      throw new Error(`worker ${identity} not found`);
    }

    return worker;
  }

  private async getTLSConfig(
    tls: z.infer<typeof ConnectionSchema>['tls'],
    sig: Sig
  ): Promise<TLSConfig> {
    const tlsConfig: TLSConfig = {
      serverRootCACertificate: undefined,
      clientCertPair: undefined,
    };

    switch (tls.source) {
      case 'filesystem':
        sig.info(`loading tls config from filesystem`);
        tlsConfig.serverRootCACertificate = tls.paths.ca
          ? fs.readFileSync(tls.paths.ca)
          : undefined;
        tlsConfig.clientCertPair = {
          crt: fs.readFileSync(tls.paths.cert),
          key: fs.readFileSync(tls.paths.key),
        };
        break;
      case 's3': {
        sig.info(`loading tls config from s3 ${tls.region} ${tls.bucket}`);
        const s3 = new S3Client({ region: tls.region });

        if (tls.paths.ca) {
          const ca = await s3.send(
            new GetObjectCommand({
              Bucket: tls.bucket,
              Key: tls.paths.ca,
            })
          );

          const caBuffer = await ca.Body?.transformToByteArray();
          if (caBuffer) {
            tlsConfig.serverRootCACertificate = Buffer.from(caBuffer);
          }
        }

        sig.info(`loading cert from s3 ${tls.bucket} ${tls.paths.cert}`);
        const cert = await s3.send(
          new GetObjectCommand({
            Bucket: tls.bucket,
            Key: tls.paths.cert,
          })
        );
        const key = await s3.send(
          new GetObjectCommand({
            Bucket: tls.bucket,
            Key: tls.paths.key,
          })
        );

        const certBuffer = await cert.Body?.transformToByteArray();
        const keyBuffer = await key.Body?.transformToByteArray();

        if (certBuffer && keyBuffer) {
          tlsConfig.clientCertPair = {
            crt: Buffer.from(certBuffer),
            key: Buffer.from(keyBuffer),
          };
        }
        break;
      }
      default: {
        const _: never = tls;
        throw new Error(`Invalid tls source: ${_}`);
      }
    }

    return tlsConfig;
  }
}
