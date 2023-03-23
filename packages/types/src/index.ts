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
