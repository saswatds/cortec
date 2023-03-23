import type { Cb, Ctx } from '@cortes/types';
import config from 'config';

export default function (ctx: Ctx, _: unknown, done: Cb) {
  ctx.set('config', config);
  return done();
}
