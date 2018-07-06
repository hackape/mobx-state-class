import {
  isArrayLike,
  isObservable,
  observable,
  IArrayWillChange,
  IArrayWillSplice,
  IMapWillChange
} from "mobx";
import { updateTreePathFactory, addTreeNode, hasTreeNode } from "../treenode";
import ReactiveNode from "../reactivenode";
import { isPrimitive, isFunction } from "./is";

const addInterceptor = <T extends { intercept: (fn: any) => any }>(target: T, interceptor: any) => {
  const disposer = target.intercept(interceptor);
  Object.defineProperty(target, "disposeReactiveInterceptor", {
    configurable: false,
    enumerable: false,
    value: disposer
  });
  return target;
};

const hasInterceptor = (target: any) => {
  return Boolean(target["disposeReactiveInterceptor"]);
};

const arrayInterceptor = (change: IArrayWillChange | IArrayWillSplice) => {
  if (change.type === "splice") {
    const { added, removedCount, object } = change;
    const offset = change.index;
    const addedCount = added.length;

    // handle newly added items' tree path
    const updateTreePath = updateTreePathFactory({ object, offset });
    const newAdded = added.map((item, i) => {
      return updateTreePath(defaultEnhancer(item), i);
    });

    // update existing items' tree path
    object
      .slice(offset + removedCount)
      .forEach(updateTreePathFactory({ object, offset: offset + addedCount }));

    return { ...change, added: newAdded };
  }

  if (change.type === "update") {
    const { index, object } = change;

    const updateTreePath = updateTreePathFactory({ object, offset: 0 });
    const newValue = updateTreePath(defaultEnhancer(change.newValue), index);

    return { ...change, newValue };
  }

  return change;
};

export function enhanceArray(target: any[]) {
  if (!isArrayLike(target)) throw Error("[MSC enhanceArray] can only accept array-like object");
  if (!isObservable(target)) target = observable.array(target);
  if (!hasTreeNode(target)) target = addTreeNode(target);
  if (!hasInterceptor(target)) target = addInterceptor(target as any, arrayInterceptor);
  return target;
}

const mapInterceptor = (change: IMapWillChange) => {
  const { type, object, name, newValue } = change;
  if (type === "add" || type === "update") {
    const updateTreePath = updateTreePathFactory({ object });
    change.newValue = updateTreePath(defaultEnhancer(newValue), name);
  }

  return change;
};

export function enhanceMap(target: Map<any, any>) {
  if (!(target instanceof Map)) throw Error("[MSC enhanceMap] can only accept Map type object");
  if (!isObservable(target)) target = observable.map(target);
  if (!hasTreeNode(target)) target = addTreeNode(target);
  if (!hasInterceptor(target)) target = addInterceptor(target as any, mapInterceptor);
  return target;
}

export function defaultEnhancer(target: any) {
  if (isPrimitive(target) || isFunction(target) || target instanceof ReactiveNode) {
    return target;
  }
  if (isArrayLike(target)) return enhanceArray(target);
  if (target instanceof Map) return enhanceMap(target);
  return target;
}
