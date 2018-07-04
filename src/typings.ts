import ReactiveNode from "./reactivenode";

type AnyFunc = (...args: any[]) => any;
type FilterNever<T> = {
  [K in keyof T]: T[K] extends never ? never : K
}[keyof T];
type _ISnapShot<T> = {
  [K in keyof T]?: T[K] extends AnyFunc
    ? never
    : T[K] extends ReactiveNode ? ISnapshot<T[K]> | T[K] : T[K]
};

export type ISnapshot<T> = Pick<_ISnapShot<T>, FilterNever<_ISnapShot<T>>>;
