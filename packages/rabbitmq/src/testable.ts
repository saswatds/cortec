import type { IContext, Sig } from '@cortec/types';
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

import CortecRabbitmq from '.';

export type TestableCortecRabbitmqConfig = {
  version: string;
};

export default class TestableCortecRabbitmq extends CortecRabbitmq {
  private testConfig: TestableCortecRabbitmqConfig;
  private container?: StartedTestContainer;
  constructor(config: TestableCortecRabbitmqConfig) {
    super();
    this.testConfig = config;
  }

  async load(context: IContext, sig: Sig) {
    sig
      .scope(this.name)
      .info(
        `rabbitmq test container with image rabbitmq:${this.testConfig.version}...`
      );

    this.container = await new GenericContainer(
      `rabbitmq:${this.testConfig.version}`
    )
      .withExposedPorts(5672, 15672)
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'root',
        RABBITMQ_DEFAULT_PASS: 'password',
      })
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(5672);

    sig
      .scope(this.name)
      .success(`rabbitmq test container running on ${host}:${port}`);

    // Override the config with the test container details
    // We are going to create the test container and then override the config with the test container details
    Object.entries(this.config).forEach(([_, defaultConfig]) => {
      defaultConfig.connection.protocol = 'amqp';
      defaultConfig.connection.hostname = host;
      defaultConfig.connection.port = port;
      defaultConfig.connection.username = 'root';
      defaultConfig.connection.password = 'password';
    });

    return super.load(context, sig);
  }
}
