import type { IConfig } from '@cortec/config';
import type Redis from '@cortec/redis';
import type { IContext, Module } from '@cortec/types';
import { FlowProducer, Queue } from 'bullmq';

interface BullConfig {
  cache: string;
  concurrency: number;
  options?: any;
}

export interface BullMQConfig {
  queue?: { [name: string]: BullConfig };
  producer?: { [name: string]: BullConfig };
}

export default class CortecBullMQ implements Module {
  name = 'bullmq';
  private $queues: { [name: string]: Queue } = {};
  private $flows: { [name: string]: FlowProducer } = {};

  async load(ctx: IContext) {
    const redis = ctx.provide<Redis>('redis');
    const config = ctx.provide<IConfig>('config');
    const bullConfig = config.get<BullMQConfig>(this.name);

    Object.entries(bullConfig['queue'] ?? {}).forEach(([key, val]) => {
      this.$queues[key] = new Queue(key, {
        connection: redis.cache(val.cache),
        defaultJobOptions: val.options,
      });
    });

    Object.entries(bullConfig['producer'] ?? {}).forEach(([key, val]) => {
      this.$flows[key] = new FlowProducer({
        connection: redis.cache(val.cache),
      });
    });
  }

  queue(name: string) {
    return this.$queues[name];
  }

  flow(name: string) {
    return this.$flows[name];
  }

  async dispose() {
    await Promise.allSettled([
      ...Object.values(this.$queues).map((q) => q.close()),
      ...Object.values(this.$flows).map((q) => q.close()),
    ]);
  }
}
