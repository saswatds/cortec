import type { Cb, Ctx } from '@cortec/types';
import config from 'config';

export default function (ctx: Ctx, _: unknown, done: Cb) {
  ctx.set('config', config);
  return done();
}
