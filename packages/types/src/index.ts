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

export interface IRoute<Req = unknown, Res = unknown, Val = unknown> {
  ctx: IContext;
  serde: ('json' | 'raw' | 'text' | 'urlencoded')[];
  authentication?: Middleware<Req>;
  validation?: Val;
  onRequest(req: Req): Promise<IResponse<Res>>;
}
