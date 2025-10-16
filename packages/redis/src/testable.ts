import type { IContext, Sig } from '@cortec/types';
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

import CortecRedis from '.';

export type TestableCortecRedisConfig = {
  version: string;
};

export default class TestableCortecRedis extends CortecRedis {
  private testConfig: TestableCortecRedisConfig;
  private container?: StartedTestContainer;
  constructor(config: TestableCortecRedisConfig, transformObject?: boolean) {
    super(transformObject);
    this.testConfig = config;
  }

  async load(context: IContext, sig: Sig) {
    sig
      .scope(this.name, 'test-container')
      .info('starting redis test container...');
    // We are going to create the test container and then override the config with the test container details
    this.container = await new GenericContainer(
      `redis:${this.testConfig.version}`
    )
      .withExposedPorts(6379)
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(6379);

    sig
      .scope(this.name, 'test-container')
      .success('redis running at ${host}:${port}');

    // Override the config with the test container details
    Object.entries(this.cacheConfig).forEach(([_, defaultConfig]) => {
      defaultConfig.connection.host = host;
      defaultConfig.connection.port = port;
    });

    return super.load(context, sig);
  }
  async dispose(): Promise<void> {
    await super.dispose();
    await this.container?.stop();
  }
}
