export type Service = {
  name: string;
  version: string;
};

export interface IContext {
  service: Service;
  provide<T = unknown>(name: string): T;
  dispose(code: number): void;
}

export interface IModule {
  name: string;
  load(ctx: IContext): Promise<void>;
  dispose(): Promise<void>;
}

export interface IController {
  ctx: IContext;
  middleware: any[];
  validation: any[];
  onRequest(): Promise<void>;
}
