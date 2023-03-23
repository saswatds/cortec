/**
 * The core package provides the foundation for loading various dependencies
 */
import type { Ctx, Exit, IContextProvide, OnExit } from '@cortes/types';
import { applyEachSeries, series } from 'async';

const ctx: Ctx = new Map();

export function load(
  plugins: IContextProvide[],
  done: (exit: Exit, x: Ctx<any>) => void
) {
  let exits: OnExit[] = [];
  const onExit = (code?: number) => {
    series(exits.reverse(), () => {
      code !== undefined && process.exit(code);
    });
  };

  (applyEachSeries(plugins, ctx, onExit) as any)(
    (err: Error, data: OnExit[]) => {
      // If there is an error then just throw
      if (err) throw err;

      exits = data.filter(Boolean);
      done(onExit, ctx);
    }
  );
}
