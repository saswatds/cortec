import http from 'node:http';
import https from 'node:https';
import URL from 'node:url';

import { type IConfig, Config } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import { type ITrace, Headers } from '@cortec/polka';
import type { IContext, IModule } from '@cortec/types';
import type * as A from 'axios';
import axios, { isAxiosError } from 'axios';
import { backOff } from 'exponential-backoff';
import capitalize from 'lodash.capitalize';

export interface IAxiosConfig {
  global?: A.AxiosRequestConfig;
  api: {
    [key: string]: A.AxiosRequestConfig;
  };
}

interface TracedAxios extends A.AxiosInstance {
  trace(ctx: ITrace): A.AxiosInstance;
}

export interface IAxios {
  service(name: string, flags?: RequestFlags): TracedAxios;
}

export enum RequestFlags {
  None = 0,
  Notice4XX = 1 << 0,
  InstrumentUrl = 1 << 1,
  NoRetry = 1 << 2,
}

function match(trait: RequestFlags, flag: RequestFlags): boolean {
  return (trait & flag) === flag;
}

class ExternalServiceError extends Error {
  constructor(service: string, err: A.AxiosError) {
    super(
      `service=${service} method=${err.request?.method} path=${
        err.request?.path
      } status=${err.response?.status} body=${JSON.stringify(
        err.response?.data
      )}`
    );
    this.name = 'ExternalServiceError';
  }
}

export default class Axios implements IModule, IAxios {
  name = 'axios';
  private instances: Map<string, A.Axios> = new Map();
  private services: string[];
  private nr: INewrelic | undefined;
  constructor(services: string[]) {
    this.services = services;
  }

  async load(ctx: IContext) {
    this.nr = ctx.provide<INewrelic>('newrelic');

    const config = ctx.provide<IConfig>('config');
    const axiosConfig = config?.get<IAxiosConfig>(this.name);

    if (!axiosConfig) {
      throw new Error(`Missing configuration for ${this.name}`);
    }

    for (const key of this.services) {
      // Since we still don't have a static guarantee that service name `key` is an item of
      // `axiosConfig.api`, throw if it's undefined.
      if (!axiosConfig.api[key]) {
        const sources = Config.files().join(', ');
        throw new Error(
          `Missing service definition "${key}" in all config sources: ${sources}`
        );
      }

      const instance = axios.create({
        ...(axiosConfig.global ?? {}),
        ...axiosConfig.api[key],
        httpsAgent: new https.Agent({ keepAlive: true }),
        httpAgent: new http.Agent({ keepAlive: true }),
      });

      this.instances.set(key, instance);
    }
  }
  async dispose() {
    this.instances.clear();
  }

  service(name: string, flags: RequestFlags = RequestFlags.None): TracedAxios {
    const nr = this.nr;

    const instance = this.instances.get(name);

    if (!instance) {
      throw new Error(
        `Service ${name} is not configured. Available services: ${this.services.join(
          ', '
        )}`
      );
    }

    // Else return a proxy that wraps the original instance
    return new Proxy<TracedAxios>(instance as TracedAxios, {
      get(target, prop, receiver) {
        if (prop === 'trace')
          return (ctx: ITrace) => {
            target.defaults.headers.common[Headers.TRACE_ID] = ctx.trace.id;
            return receiver;
          };

        // If not the method is not a HTTP method, return the original method
        if (
          ![
            'request',
            'get',
            'post',
            'put',
            'delete',
            'patch',
            'head',
            'options',
            'postForm',
            'putForm',
            'patchForm',
          ].includes(prop as string) ||
          !nr
        )
          return Reflect.get(target, prop, receiver);

        return (...args: any) =>
          nr.api.startBackgroundTransaction(
            `ExternalService/${capitalize(name)}`,
            () => {
              if (
                match(flags, RequestFlags.InstrumentUrl) &&
                typeof args[0] === 'string'
              ) {
                //record the URL and the method of the request
                const instrumentedUrl = URL.parse('http://localhost' + args[0]);

                nr.api.addCustomAttribute(
                  'path',
                  instrumentedUrl.pathname ?? '<unknown>'
                );
                nr.api.addCustomAttribute('method', prop.toString());
              }

              const instance = Reflect.get(target, prop, receiver);

              // Execute the request and retry it if it fails
              return backOff(() => instance(...args), {
                numOfAttempts: 5,
                startingDelay: 100,
                retry: (err: A.AxiosError) => {
                  // If the request is marked as no retry, we should not retry
                  if (match(flags, RequestFlags.NoRetry)) return false;

                  // If the error is not an axios error, we should not retry
                  if (!isAxiosError(err)) return false;

                  // Get the status code of the error and default to 0 if it's not present
                  const status = err.response?.status ?? 0;

                  // If the error is a server error, we should retry
                  return status >= 500;
                },
              }).catch((err: A.AxiosError) => {
                // We are trying to figure-out of the external service is at fault
                // So any non axios errors should be ignored and we throw back the original error
                if (!isAxiosError(err)) throw err;

                const status = err.response?.status ?? 0;

                // Now we know that the error is from axios, now we need to check if the error
                // is a server error i.e 5xx.
                if (status >= 500)
                  nr.api.noticeError(new ExternalServiceError(name, err));

                // 4xx are client side errors and must be ignored unless specifically
                // asked to be reported
                if (
                  match(flags, RequestFlags.Notice4XX) &&
                  status >= 400 &&
                  status < 500
                )
                  nr.api.noticeError(new ExternalServiceError(name, err));

                throw err;
              });
            }
          );
      },
    });
  }
}
