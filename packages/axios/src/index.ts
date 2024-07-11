import http from 'node:http';
import https from 'node:https';

import { type IConfig, Config } from '@cortec/config';
import type { INewrelic } from '@cortec/newrelic';
import {
  type IContext,
  type IModule,
  type ITrace,
  Headers,
} from '@cortec/types';
import type * as A from 'axios';
import axios, { isAxiosError } from 'axios';
import capitalize from 'lodash.capitalize';

export interface IAxiosConfig {
  global?: A.AxiosRequestConfig;
  api: {
    [key: string]: A.AxiosRequestConfig;
  };
}

interface WithCtxAxios extends A.Axios {
  with(ctx: ITrace): A.Axios;
}

export interface IAxios {
  service(name: string, flags?: RequestFlags): WithCtxAxios;
}

export enum RequestFlags {
  None = 0,
  Notice4XX = 1 << 0,
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

  service(name: string, flags: RequestFlags = RequestFlags.None): WithCtxAxios {
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
    return new Proxy<WithCtxAxios>(instance as WithCtxAxios, {
      get(target, prop, receiver) {
        if (prop === 'with')
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
            () =>
              Reflect.get(
                target,
                prop,
                receiver
              )(...args).catch((err: A.AxiosError) => {
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
              })
          );
      },
    });
  }
}
