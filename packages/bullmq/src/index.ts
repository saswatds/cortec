import type { IConfig } from '@cortec/config';
import type Redis from '@cortec/redis';
import type { IContext, IModule, Sig } from '@cortec/types';
import type { DefaultJobOptions, Processor } from 'bullmq';
import { FlowProducer, Queue, Worker } from 'bullmq';

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
  worker(name: string): Worker;
}

export default class CortecBullMQ implements IModule, IBullMQ {
  name = 'bullmq';
  private $queues: { [name: string]: Queue } = {};
  private $flows: { [name: string]: FlowProducer } = {};
  private $workers: { [name: string]: Worker } = {};
  private workerMap: Record<string, Processor>;

  constructor(workerMap: Record<string, Processor> = {}) {
    this.workerMap = workerMap;
  }

  async load(ctx: IContext, sig: Sig) {
    const redis = ctx.require<Redis>('redis');
    const config = ctx.require<IConfig>('config');
    const bullConfig = config?.get<BullMQConfig>(this.name);

    Object.entries(bullConfig?.['queue'] ?? {}).forEach(([key, val]) => {
      this.$queues[key] = new Queue(key, {
        connection: redis.cache(val.cache),
        defaultJobOptions: val.options,
      });

      sig
        .scope(this.name, key)
        .success('created queue over redis: ' + val.cache);
    });

    Object.entries(bullConfig?.['producer'] ?? {}).forEach(([key, val]) => {
      this.$flows[key] = new FlowProducer({
        connection: redis.cache(val.cache),
      });

      sig
        .scope(this.name, key)
        .success('created flow producer over redis: ' + val.cache);
    });

    Object.entries(this.workerMap).forEach(([key, val]) => {
      const workerConfig = bullConfig?.queue?.[key];
      if (!workerConfig)
        throw new Error(`No BullMQ queue config found for '${key}'`);

      this.$workers[key] = new Worker(key, val.bind(this), {
        connection: redis.cache(workerConfig.cache),
        concurrency: workerConfig.concurrency ?? 1,
      });

      sig
        .scope(this.name, key)
        .success('created worker over redis: ' + workerConfig.cache);
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

  worker(name: string) {
    const w = this.$workers[name];

    if (!w) throw new Error(`No BullMQ worker '${name}' found`);

    return w;
  }

  async dispose() {
    await Promise.allSettled([
      ...Object.values(this.$queues).map((q) => q.close()),
      ...Object.values(this.$flows).map((q) => q.close()),
      ...Object.values(this.$workers).map((w) => w.close()),
    ]);
  }
}
