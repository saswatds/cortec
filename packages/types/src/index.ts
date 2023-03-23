import type { Injector } from 'typed-inject';
export type IModule = (injector: Injector, exit: Exit) => Promise<Disposer>;
export type Exit = (code: number) => void;
export type ExitCallback = (exit: Exit) => void;
export type Disposer = () => Promise<void>;
