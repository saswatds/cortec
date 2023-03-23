/**
 * The core package provides the foundation for loading various dependencies
 */
import type { Ctx, Exit, IContextProvide, OnExit } from '@cortec/types';
import { applyEachSeries, series } from 'async';

export type Service = {
  pkg: any;
  env: string;
};

const ctx: Ctx = new Map();

export function load(
  service: Service,
  plugins: IContextProvide[],
  done: (exit: Exit, x: Ctx<any>) => void
) {
  let exits: OnExit[] = [];
  const onExit = (code?: number) => {
    series(exits.reverse(), () => {
      code !== undefined && process.exit(code);
    });
  };

  ctx.set('service', service);

  (applyEachSeries(plugins, ctx, onExit) as any)(
    (err: Error, data: OnExit[]) => {
      // If there is an error then just throw
      if (err) throw err;

      exits = data.filter(Boolean);
      done(onExit, ctx);
    }
  );
}
