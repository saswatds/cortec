import type { IContext, IResponse, IRoute, Middleware } from '@cortec/types';
import type polka from 'polka';
import type querystring from 'querystring';
import type { z } from 'zod';

interface ZodSchema<
  ParamsT,
  ParamsD extends z.ZodTypeDef,
  QueryT,
  QueryD extends z.ZodTypeDef,
  BodyT,
  BodyD extends z.ZodTypeDef,
  ResponseT,
  ResponseD extends z.ZodTypeDef
> {
  params?: z.Schema<ParamsT, ParamsD>;
  query?: z.Schema<QueryT, QueryD>;
  body?: z.Schema<BodyT, BodyD>;
  response?: z.Schema<ResponseT, ResponseD>;
}

export abstract class HttpRoute<
  Req extends polka.Request,
  Ctx,
  ParamsT extends Record<string, string> | unknown = unknown,
  ParamsD extends z.ZodTypeDef = never,
  QueryT extends querystring.ParsedUrlQuery | unknown = unknown,
  QueryD extends z.ZodTypeDef = never,
  BodyT = unknown,
  BodyD extends z.ZodTypeDef = never,
  ResponseT = undefined,
  ResponseD extends z.ZodTypeDef = never,
  Schema = ZodSchema<
    ParamsT,
    ParamsD,
    QueryT,
    QueryD,
    BodyT,
    BodyD,
    ResponseT,
    ResponseD
  >
> implements IRoute<Req, ResponseT, Schema, Ctx>
{
  ctx: IContext;
  serde: ('json' | 'raw' | 'text' | 'urlencoded')[] = ['json'];
  abstract authentication: Middleware<Req>;
  abstract schema: Schema;
  constructor(ctx: IContext) {
    this.ctx = ctx;
  }
  abstract onRequest(ctx: Ctx, req: Req): Promise<IResponse<ResponseT>>;
}

export type IRequestContextBuilder<T> = (req: polka.Request) => T;
