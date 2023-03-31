import type http from 'node:http';

import type querystring from 'querystring';
import type { TaskInnerAPI } from 'tasuku';
import type { z } from 'zod';
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

export interface IRealtime {
  publish(): void;
}

export interface IResponse<T> {
  status: number;
  body: T;
}

export type IRequest<
  ParamsT extends Record<string, string> | unknown,
  QueryT extends querystring.ParsedUrlQuery | unknown,
  BodyT
> = {
  params: ParamsT;
  query: QueryT;
  body: BodyT | undefined;
  headers: http.IncomingHttpHeaders;
};

export interface IRoute<
  ParamsT extends Record<string, string> | unknown,
  ParamsD extends z.ZodTypeDef,
  QueryT extends querystring.ParsedUrlQuery | unknown,
  QueryD extends z.ZodTypeDef,
  BodyT,
  BodyD extends z.ZodTypeDef,
  ResponseT,
  ResponseD extends z.ZodTypeDef,
  ReqCtx
> {
  modules?: string[];
  serde?: ('json' | 'raw' | 'text' | 'urlencoded')[];
  schema?: {
    params?: z.Schema<ParamsT, ParamsD>;
    query?: z.Schema<QueryT, QueryD>;
    body?: z.Schema<BodyT, BodyD>;
    response?: z.Schema<ResponseT, ResponseD>;
  };
  authentication(
    this: IContext,
    req: IRequest<ParamsT, QueryT, BodyT>
  ): Promise<void>;

  onRequest(
    this: IContext,
    req: IRequest<ParamsT, QueryT, BodyT>,
    ctx: ReqCtx
  ): Promise<IResponse<ResponseT>>;
}

export function route<
  ParamsT extends Record<string, string> | unknown = unknown,
  ParamsD extends z.ZodTypeDef = never,
  QueryT extends querystring.ParsedUrlQuery | unknown = unknown,
  QueryD extends z.ZodTypeDef = never,
  BodyT = unknown,
  BodyD extends z.ZodTypeDef = never,
  ResponseT = unknown,
  ResponseD extends z.ZodTypeDef = never,
  ReqCtx = unknown
>(
  route: IRoute<
    ParamsT,
    ParamsD,
    QueryT,
    QueryD,
    BodyT,
    BodyD,
    ResponseT,
    ResponseD,
    ReqCtx
  >
) {
  if (!route.serde) route.serde = ['json'];
  if (!route.modules) route.modules = [];
  return route;
}

interface IApp {
  get: (path: string, handler: ReturnType<typeof route>) => void;
  post: (path: string, handler: ReturnType<typeof route>) => void;
  put: (path: string, handler: ReturnType<typeof route>) => void;
  delete: (path: string, handler: ReturnType<typeof route>) => void;
  patch: (path: string, handler: ReturnType<typeof route>) => void;
  head: (path: string, handler: ReturnType<typeof route>) => void;
  options: (path: string, handler: ReturnType<typeof route>) => void;
  trace: (path: string, handler: ReturnType<typeof route>) => void;
  connect: (path: string, handler: ReturnType<typeof route>) => void;
}

export type IRouter = (app: IApp, ctx: IContext) => void;
