import { config } from './packages/config';
import { load } from './packages/core';

load([config]).then(() => {
  /*NoOp*/
});
