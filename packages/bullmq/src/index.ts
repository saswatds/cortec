import type { Cb, Ctx } from '@cortec/types';
import { FlowProducer, Queue } from 'bullmq';
import config from 'config';

export interface BullMQConfig {
  cache: string;
  concurrency: number;
  flow?: boolean;
}

/**
 * Library to handle cross service communication
 *
 * @param {Map} ctx
 * @param {Function} done
 */
export default function (ctx: Ctx, _: unknown, done: Cb) {
  const cache = ctx.get('cache'),
    bullConfig: { [name: string]: BullMQConfig } = config.util.toObject(
      config.get<BullMQConfig>('bullmq')
    ),
    queue: { [name: string]: Queue } = {},
    queue_p: { [name: string]: FlowProducer } = {};

  Object.entries(bullConfig['queue'] ?? {}).forEach(([key, val]) => {
    queue[key] = new Queue(key, {
      connection: cache(val.cache),
      defaultJobOptions: val.options,
    });
  });

  Object.entries(bullConfig['producer'] ?? {}).forEach(([key, val]) => {
    queue_p[key] = new FlowProducer({ connection: cache(val.cache) });
  });

  ctx.set('queue', (name: string) => queue[name]);
  ctx.set('queue_p', (name: string) => queue_p[name]);
  ctx.set('_queues', Object.values(queue));

  return done(undefined, (next) => {
    Object.values(queue).forEach((q) => q.close());
    Object.values(queue_p).forEach((q) => q.close());
    next();
  });
}
