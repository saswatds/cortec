import http from 'node:http';
import https from 'node:https';

import type { IConfig } from '@cortec/config';
import type { IContext, IModule } from '@cortec/types';
import type { Axios, AxiosRequestConfig } from 'axios';
import axios from 'axios';

export interface IAxiosConfig {
  global?: AxiosRequestConfig;
  api: {
    [key: string]: AxiosRequestConfig;
  };
}

export interface IRequester {
  api(name: string): Axios;
}

export default class CortecAxios implements IModule, IRequester {
  name = 'axios';
  private instances: Map<string, Axios> = new Map();
  async load(ctx: IContext) {
    const config = ctx.provide<IConfig>('config');
    const axiosConfig = config?.get<IAxiosConfig>(this.name);

    if (!axiosConfig) {
      throw new Error(`Missing configuration for ${this.name}`);
    }

    for (const [key, value] of Object.entries(axiosConfig.api)) {
      const instance = axios.create({
        ...(axiosConfig.global ?? {}),
        ...value,
        httpsAgent: new https.Agent({ keepAlive: true }),
        httpAgent: new http.Agent({ keepAlive: true }),
      });
      this.instances.set(key, instance);
    }
  }
  async dispose() {
    this.instances.clear();
  }

  api(name: string): Axios {
    const instance = this.instances.get(name);
    if (!instance) {
      throw new Error(`Missing requester for ${name}`);
    }
    return instance;
  }
}
