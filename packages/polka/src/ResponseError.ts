import type http from 'node:http';

import HttpStatusCode from './HttpStatusCodes';
import send from './send';
import type { ITrace } from './types';

export enum ErrorFlags {
  None = 0,
  InjectTrace = 1 << 0, // using 0 for consistency
}

function match(trait: ErrorFlags, flag: ErrorFlags): boolean {
  return (trait & flag) === flag;
}

export default class ResponseError<T = unknown> extends Error {
  statusCode: number;
  details: T;
  private flags: ErrorFlags;

  constructor(
    statusCode: HttpStatusCode,
    message: string,
    details: T,
    flags: ErrorFlags = ErrorFlags.None
  ) {
    super(message);

    this.statusCode = statusCode;
    this.details = details;
    this.flags = flags;
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
        message: match(this.flags, ErrorFlags.InjectTrace)
          ? `${this.message} (Trace Id: ${traceId})`
          : this.message,
        traceId: req.trace.id,
        details: this.details,
      },
    });
  }
}
