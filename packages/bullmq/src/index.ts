import type { IConfig } from '@cortec/config';
import type Redis from '@cortec/redis';
import type { IContext, IModule } from '@cortec/types';
import type { DefaultJobOptions } from 'bullmq';
import { FlowProducer, Queue } from 'bullmq';

interface BullConfig {
  cache: string;
  concurrency: number;
  flow?: boolean;
  options?: DefaultJobOptions;
}

interface BullMQConfig {
  queue?: { [name: string]: BullConfig };
  producer?: { [name: string]: BullConfig };
}

export interface IBullMQ {
  queue(name: string): Queue;
  flow(name: string): FlowProducer;
}

export default class CortecBullMQ implements IModule, IBullMQ {
  name = 'bullMQ';
  private $queues: { [name: string]: Queue } = {};
  private $flows: { [name: string]: FlowProducer } = {};

  async load(ctx: IContext) {
    const redis = ctx.require<Redis>('redis');
    const config = ctx.require<IConfig>('config');
    const bullConfig = config?.get<BullMQConfig>(this.name);

    Object.entries(bullConfig?.['queue'] ?? {}).forEach(([key, val]) => {
      this.$queues[key] = new Queue(key, {
        connection: redis.cache(val.cache),
        defaultJobOptions: val.options,
      });
    });

    Object.entries(bullConfig?.['producer'] ?? {}).forEach(([key, val]) => {
      this.$flows[key] = new FlowProducer({
        connection: redis.cache(val.cache),
      });
    });
  }

  queue(name: string) {
    const q = this.$queues[name];

    if (!q) throw new Error(`No BullMQ queue '${name}' found`);

    return q;
  }

  flow(name: string) {
    const q = this.$flows[name];

    if (!q) throw new Error(`No BullMQ flow '${name}' found`);

    return q;
  }

  async dispose() {
    await Promise.allSettled([
      ...Object.values(this.$queues).map((q) => q.close()),
      ...Object.values(this.$flows).map((q) => q.close()),
    ]);
  }
}
