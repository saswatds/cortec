export type Service = {
  name: string;
  version: string;
};

export interface IContext {
  service: Service;
  provide<T = unknown>(name: string): T?;
  dispose(code: number): void;
}

export interface IModule {
  name: string;
  load(ctx: IContext): Promise<void>;
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

export interface IController<Req, Res = unknown> {
  ctx: IContext;
  body: ('json' | 'raw' | 'text' | 'urlencoded')[];
  middleware?: Middleware<Req>[];
  validation?: unknown;
  onRequest(req: Req): Promise<IResponse<Res>>;
}
