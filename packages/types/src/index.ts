export type Service = {
  name: string;
  version: string;
};

export interface IContext {
  service: Service;
  provide<T = unknown>(name: string): T;
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

export type Middleware<
  Param extends { [name: string]: string },
  Query extends { [name: string]: string },
  Body
> = (
  ctx: IContext,
  req: {
    params: Param;
    query: Query;
    body: Body;
  }
) => Promise<void>;

export interface IController<
  Param extends { [name: string]: string },
  Query extends { [name: string]: string },
  Body,
  Response
> {
  ctx: IContext;
  middleware?: Middleware<Param, Query, Body>[];
  validation?: unknown[];
  onRequest(
    req: {
      params: Param;
      query: Query;
      body: Body;
    },
    realtime: IRealtime
  ): Promise<IResponse<Response>>;
}
