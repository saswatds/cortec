import type http from 'node:http';

import type { ConsolaInstance as Sig } from 'consola';
export type { Sig };

export type Service = {
  name: string;
  version: string;
};

export interface IServerHandler {
  handler(): http.RequestListener | undefined;
}

export interface IContext {
  service: Service;
  provide<T = unknown>(name: string): T | undefined;
  require<T = unknown>(name: string): T;
  dispose(code: number): void;
  has(name: string): boolean;
}

export interface IModule {
  name: string;
  load(ctx: IContext, consola: Sig): Promise<void>;
  dispose(): Promise<void>;
}
