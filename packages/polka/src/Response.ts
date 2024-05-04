import type http from 'http';

import HttpStatusCode from './HttpStatusCodes';
import type { IResponse } from './types';

export default class Response<T = unknown> implements IResponse<T> {
  status: HttpStatusCode;
  body: T;
  headers?: http.OutgoingHttpHeaders;
  private constructor(
    body: T,
    status: HttpStatusCode,
    headers?: http.OutgoingHttpHeaders
  ) {
    this.status = status;
    this.headers = headers;
    this.body = body;
  }

  static create<T>(body: T, status: HttpStatusCode = HttpStatusCode.OK) {
    return new Response(body, status);
  }

  static text(
    body: string,
    status: HttpStatusCode = HttpStatusCode.OK,
    headers?: http.OutgoingHttpHeaders
  ) {
    return new Response(body, status, {
      'content-type': 'text/plain',
      ...headers,
    });
  }

  static json<T>(
    body: T,
    status: HttpStatusCode = HttpStatusCode.OK,
    headers?: http.OutgoingHttpHeaders
  ) {
    return new Response(body, status, {
      'content-type': 'application/json',
      ...headers,
    });
  }
}
