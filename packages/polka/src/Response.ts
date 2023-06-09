import HttpStatusCode from './HttpStatusCodes';
import type { IResponse } from './types';

export default class Response<T = unknown> implements IResponse<T> {
  status: HttpStatusCode;
  body: T;
  private constructor(body: T, status: HttpStatusCode) {
    this.status = status;
    this.body = body;
  }

  static create<T>(body: T, status: HttpStatusCode = HttpStatusCode.OK) {
    return new Response(body, status);
  }
}
