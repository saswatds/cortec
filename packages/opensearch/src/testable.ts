import type { StartedOpenSearchContainer } from '@testcontainers/opensearch';
import { OpenSearchContainer } from '@testcontainers/opensearch';

import CortecOpensearch from './';

export type TestableCortecOpensearchConfig = {
  version: string;
};

export default class TestableCortecOpensearch extends CortecOpensearch {
  private testConfig: TestableCortecOpensearchConfig;
  private container?: StartedOpenSearchContainer;

  constructor(config: TestableCortecOpensearchConfig) {
    super();
    this.testConfig = config;
  }

  async load(context: any, sig: any) {
    sig
      .scope(this.name)
      .info(
        `starting opensearch test container with image public.ecr.aws/opensearchproject/opensearch:${this.testConfig.version}...`
      );
    // We are going to create the test container and then override the config with the test container details
    this.container = await new OpenSearchContainer(
      `public.ecr.aws/opensearchproject/opensearch:${this.testConfig.version}`
    )
      .withAutoRemove(false)
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(9200);
    const username = this.container.getUsername();
    const password = this.container.getPassword();

    sig
      .scope(this.name)
      .success(`opensearch test container running on http://${host}:${port}`);

    // Override the config with the test container details
    Object.entries(this.config).forEach(([_, defaultConfig]) => {
      defaultConfig.connection.host = `https://${host}`;
      defaultConfig.connection.port = port;
      defaultConfig.connection.user = username;
      defaultConfig.connection.password = password;
      defaultConfig.connection.caFile = undefined;
      defaultConfig.connection.rejectUnauthorized = false;
    });

    return super.load(context, sig);
  }
  async dispose() {
    await super.dispose();
    await this.container?.stop();
  }
}
