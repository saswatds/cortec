import type { ServerResponse } from 'node:http';
import { STATUS_CODES } from 'node:http';

const TYPE = 'content-type';
const OSTREAM = 'application/octet-stream';

export default function (
  res: ServerResponse,
  code = 200,
  data: any = '',
  headers: any = {}
) {
  let k;
  const obj: any = {};
  for (k in headers) {
    obj[k.toLowerCase()] = headers[k];
  }

  let type = obj[TYPE] || res.getHeader(TYPE);

  if (!!data && typeof data.pipe === 'function') {
    res.setHeader(TYPE, type || OSTREAM);
    return data.pipe(res);
  }

  if (data instanceof Buffer) {
    type = type || OSTREAM; // prefer given
  } else if (typeof data === 'object') {
    data = JSON.stringify(data);
    type = type || 'application/json;charset=utf-8';
  } else {
    data = data || STATUS_CODES[code];
  }

  obj[TYPE] = type || 'text/plain';
  obj['content-length'] = Buffer.byteLength(data);

  res.writeHead(code, obj);
  res.end(data);
}
