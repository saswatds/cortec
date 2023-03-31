import type http from 'node:http';

import type { TaskInnerAPI } from 'tasuku';
export type Service = {
  name: string;
  version: string;
};

export interface IContext {
  service: Service;
  provide<T = unknown>(name: string): T | undefined;
  dispose(code: number): void;
}

export interface IModule {
  name: string;
  load(ctx: IContext, task: TaskInnerAPI): Promise<void>;
  dispose(): Promise<void>;
}

export interface IRealtime {
  publish(): void;
}

export interface IResponse<T> {
  status: number;
  body: T;
}

export type Middleware<T> = (ctx: IContext, req: T) => Promise<void>;

export interface IRoute<
  Req = unknown,
  Res = unknown,
  Val = unknown,
  Ctx = unknown
> {
  ctx: IContext;
  serde: ('json' | 'raw' | 'text' | 'urlencoded')[];
  authentication: Middleware<Req>;
  schema: Val;
  onRequest(ctx: Ctx, req: Req): Promise<IResponse<Res>>;
}

export interface IServerHandler {
  handler(): http.RequestListener | undefined;
}
