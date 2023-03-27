export type Ctx<T = any> = Map<string, T>;
export type OnExit = (cb: (err?: string | Error) => void) => void;
export type Exit = (code?: number) => void;
export type Cb = (err?: string | Error, onExit?: OnExit) => void;

export type IContextProvide<T = any> =
  | {
      (ctx: Ctx<T>, exit: Exit, done: Cb): void;
    }
  | {
      (ctx: Ctx<T>, exit: Exit): Promise<OnExit | void>;
    };

export type Service = {
  name: string;
  version: string;
};

export interface IContext {
  service: Service;
  provide<T = unknown>(name: string): T;
  dispose(code: number): void;
}

export interface Module {
  name: string;
  load(ctx: IContext): Promise<void>;
  dispose(): Promise<void>;
}
