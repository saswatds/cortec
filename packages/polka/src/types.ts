import type http from 'node:http';

import type { IContext } from '@cortec/types';
import type { Polka } from 'polka';
import type querystring from 'querystring';
import type { ServeStaticOptions } from 'serve-static';
import type { z } from 'zod';

export interface IResponse<T> {
  status: number;
  body: T;
  headers?: http.OutgoingHttpHeaders;
}

export interface IRequest<
  ParamsT extends Record<string, string> | unknown,
  QueryT extends querystring.ParsedUrlQuery | unknown,
  BodyT
> extends http.IncomingMessage {
  params: ParamsT;
  query: QueryT;
  body?: BodyT;
}

export interface IRoute<
  ParamsT extends Record<string, string> | unknown,
  ParamsD extends z.ZodTypeDef,
  QueryT extends querystring.ParsedUrlQuery | unknown,
  QueryD extends z.ZodTypeDef,
  BodyT,
  BodyD extends z.ZodTypeDef,
  ResponseT,
  ResponseD extends z.ZodTypeDef,
  ReqCtx extends { [name: string]: unknown },
  Session
> {
  modules?: string[];
  serde?: ('json' | 'raw' | 'text' | 'urlencoded')[];
  schema?: {
    params?: z.Schema<ParamsT, ParamsD>;
    query?: z.Schema<QueryT, QueryD>;
    body?: z.Schema<BodyT, BodyD>;
    response?: z.Schema<ResponseT, ResponseD>;
  };
  rateLimit?: {
    cache: string;
    limit: number;
    duration: number;
    count(
      this: IContext,
      req: IRequest<ParamsT, QueryT, BodyT>,
      ctx: ReqCtx & { session?: Session }
    ): string;
    keyPrefix?: string;
  };

  ctx?(this: IContext, req: IRequest<ParamsT, QueryT, BodyT>): ReqCtx;
  authentication?(
    this: IContext,
    req: IRequest<ParamsT, QueryT, BodyT>
  ): Promise<Session>;

  onRequest(
    this: IContext,
    req: IRequest<ParamsT, QueryT, BodyT>,
    ctx: ReqCtx & { session: Session }
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
  ReqCtx extends { [name: string]: unknown } = Record<string, unknown>,
  Session = unknown
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
    ReqCtx,
    Session
  >
) {
  if (!route.serde) route.serde = ['json'];
  if (!route.modules) route.modules = [];
  return route;
}

export interface IApp extends Pick<Polka, 'use'> {
  // Match any HTTP method
  all: (path: string, handler: ReturnType<typeof route>) => void;

  // Match HTTP methods
  get: (path: string, handler: ReturnType<typeof route>) => void;
  post: (path: string, handler: ReturnType<typeof route>) => void;
  put: (path: string, handler: ReturnType<typeof route>) => void;
  delete: (path: string, handler: ReturnType<typeof route>) => void;
  patch: (path: string, handler: ReturnType<typeof route>) => void;
  head: (path: string, handler: ReturnType<typeof route>) => void;
  options: (path: string, handler: ReturnType<typeof route>) => void;
  trace: (path: string, handler: ReturnType<typeof route>) => void;
  connect: (path: string, handler: ReturnType<typeof route>) => void;

  // No match found
  noMatch(handler: ReturnType<typeof route>): void;
  static(path: string, dir: string, options?: ServeStaticOptions): void;
}

export type IRouter = (app: IApp, ctx: IContext) => void;
