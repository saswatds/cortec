import type { IContext, Sig } from '@cortec/types';
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

import { CortecMongoDB } from './main';

export type TestableCortecMongoDBConfig = {
  version: string;
};

export class TestableCortecMongoDB extends CortecMongoDB {
  private testConfig: TestableCortecMongoDBConfig;
  private container?: StartedTestContainer;
  constructor(config: TestableCortecMongoDBConfig) {
    super();
    this.testConfig = config;
  }

  async load(context: IContext, sig: Sig) {
    sig
      .scope(this.name)
      .info(
        `starting mongodb test container with image mongo:${this.testConfig.version}...`
      );

    // We are going to create the test container and then override the config with the test container details
    this.container = await new GenericContainer(
      `mongo:${this.testConfig.version}`
    )
      .withExposedPorts(27017)
      .withHealthCheck({
        test: [
          'CMD-SHELL',
          'mongo --eval "db.adminCommand(\'ping\')" --port 27017 --quiet',
        ],
        interval: 5_000,
        startPeriod: 30_000,
      })
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(27017);

    sig
      .scope(this.name)
      .success(`mongodb test container running on mongodb://${host}:${port}`);

    // Override the config with the test container details
    Object.entries(this.dbConfig).forEach(([_, defaultConfig]) => {
      defaultConfig.connection.host = `${host}:${port}`;
      defaultConfig.connection.ssl = false;
      defaultConfig.options['replicaSet'] = undefined;
    });

    return super.load(context, sig);
  }
  async dispose() {
    await super.dispose();
    await this.container?.stop();
  }
}
