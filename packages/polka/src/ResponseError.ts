import type http from 'node:http';

import type { ITrace } from '@cortec/types';

import HttpStatusCode from './HttpStatusCodes';
import send from './send';

export default class ResponseError<T = unknown> extends Error {
  statusCode: number;
  details: T;
  private injectTraceInMessage;

  constructor(
    statusCode: HttpStatusCode,
    message: string,
    details: T,
    injectTraceInMessage = false
  ) {
    super(message);

    this.statusCode = statusCode;
    this.details = details;
    this.injectTraceInMessage = injectTraceInMessage;
  }

  get name() {
    switch (this.statusCode) {
      case HttpStatusCode.FORBIDDEN:
        return 'Forbidden';
      case HttpStatusCode.BAD_REQUEST:
        return 'BadRequest';
      case HttpStatusCode.NOT_FOUND:
        return 'NotFound';
      case HttpStatusCode.TOO_MANY_REQUESTS:
        return 'RateLimit';
    }

    if (this.statusCode >= 500) {
      return 'ServerError';
    }

    if (this.statusCode >= 400) {
      return 'ClientError';
    }

    return 'Error';
  }

  send(res: http.ServerResponse, req: ITrace) {
    const traceId = req.trace.id;

    return send(res, this.statusCode, {
      error: {
        name: this.name,
        message: this.injectTraceInMessage
          ? `${this.message} (Trace Id: ${traceId})`
          : this.message,
        traceId: req.trace.id,
        details: this.details,
      },
    });
  }
}
