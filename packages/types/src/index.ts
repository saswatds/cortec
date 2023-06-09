import type http from 'node:http';

import type { TaskInnerAPI } from 'tasuku';

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
  dispose(code: number): void;
  has(name: string): boolean;
}

export interface IModule {
  name: string;
  load(ctx: IContext, task: TaskInnerAPI): Promise<void>;
  dispose(): Promise<void>;
}
