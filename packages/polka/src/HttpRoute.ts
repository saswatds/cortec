import type { IContext, IResponse, IRoute, Middleware } from '@cortec/types';
import type polka from 'polka';
import type querystring from 'querystring';
import type { z } from 'zod';

interface ValidationSchema<
  ParamsT extends Record<string, string> | unknown,
  ParamsD extends z.ZodTypeDef,
  QueryT extends querystring.ParsedUrlQuery | unknown,
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
  ParamsT extends Record<string, string> | unknown = unknown,
  ParamsD extends z.ZodTypeDef = never,
  QueryT extends querystring.ParsedUrlQuery | unknown = unknown,
  QueryD extends z.ZodTypeDef = never,
  BodyT = unknown,
  BodyD extends z.ZodTypeDef = never,
  ResponseT = undefined,
  ResponseD extends z.ZodTypeDef = never,
  Validation extends ValidationSchema<
    ParamsT,
    ParamsD,
    QueryT,
    QueryD,
    BodyT,
    BodyD,
    ResponseT,
    ResponseD
  > = never
> implements IRoute<Req, ResponseT, Validation>
{
  ctx: IContext;
  serde: ('json' | 'raw' | 'text' | 'urlencoded')[] = ['json'];
  abstract authentication?: Middleware<Req>;
  abstract validation?: Validation;
  constructor(ctx: IContext) {
    this.ctx = ctx;
  }
  abstract onRequest(req: Req): Promise<IResponse<ResponseT>>;
}
