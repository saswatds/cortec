import type { Cb, Ctx } from '@cortes/types';
import * as sentry from '@sentry/node';
import type { IConfig } from 'config';

/**
 * Library to handle cross service communication
 *
 * @param {Map} ctx
 * @param {Function} done
 */
export default function (ctx: Ctx, _: unknown, done: Cb) {
  const { pkg } = ctx.get('service'),
    config: IConfig = ctx.get('config'),
    sentryConfig = config.util.toObject(config.get('sentry'));

  sentry.init({
    ...sentryConfig,
    release: `${pkg.name}@${pkg.version}`,
  });

  return done(undefined, (next) => {
    sentry.close(3000).then(() => next());
  });
}
