import type http from 'node:http';

import HttpStatusCode from './HttpStatusCodes.js';
import send from './send.js';

export default class ResponseError<T = unknown> extends Error {
  statusCode: number;
  details: T;

  constructor(statusCode: HttpStatusCode, message: string, details: T) {
    super(message);

    this.statusCode = statusCode;
    this.details = details;
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

  send(res: http.ServerResponse) {
    return send(res, this.statusCode, {
      error: {
        name: this.name,
        message: this.message,
        details: this.details,
      },
    });
  }
}
