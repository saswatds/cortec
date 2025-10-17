import type { IContext, Sig } from '@cortec/types';
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

import CortecMongodb from '.';

export type TestableCortecMongodbConfig = {
  version: string;
};

export default class TestableCortecMongodb extends CortecMongodb {
  private testConfig: TestableCortecMongodbConfig;
  private container?: StartedTestContainer;
  constructor(config: TestableCortecMongodbConfig) {
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
      .withCommand(['mongod', '--bind_ip_all', '--replSet', 'rs0'])
      .withHealthCheck({
        test: [
          'CMD-SHELL',
          'echo \'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})\' | mongo --port 27017 --quiet || true; test "$(echo \'db.isMaster().ismaster\' | mongo --port 27017 --quiet)" = "true"',
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
    });

    return super.load(context, sig);
  }
  async dispose() {
    await super.dispose();
    await this.container?.stop();
  }
}
