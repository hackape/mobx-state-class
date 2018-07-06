import { $mobx, set, extendObservable, computed } from "mobx";
import { TreeNode, hasTreeNode, $treenode } from "./treenode";
import { isFunction } from "./utils/is";
import { boundActionDecorator } from "./utils/action";
import { defaultEnhancer } from "./utils/enhanceComplexTypes";

const $reactivated = Symbol("$reactivated");
// tslint:disable-next-line
function reactivatePrototype(ctor: Function) {
  if (ctor.prototype[$reactivated]) return;
  const prototypeKeys = Object.getOwnPropertyNames(ctor.prototype);

  ctor.prototype[$reactivated] = true;
  for (const key of prototypeKeys) {
    // do not touch contructor
    if (key === "constructor") continue;

    // get vanilla descriptor
    const desc = Object.getOwnPropertyDescriptor(ctor.prototype, key) || {};

    let enhancedDesc: any = desc;
    if (desc.get) {
      // @computed
      enhancedDesc = computed(ctor.prototype, key, desc);
    } else if (desc.value && isFunction(desc.value)) {
      // @action
      enhancedDesc = boundActionDecorator(ctor.prototype, key, desc);
    }

    Object.defineProperty(ctor.prototype, key, enhancedDesc);
  }

  return ctor.prototype;
}

const isReservedKey = (key: any) => {
  return key === $mobx || key === $treenode || key === "constructor";
};

// see https://github.com/mobxjs/mobx/blob/master/src/types/dynamicobject.ts
const getAdm = target => target[$mobx];
const dynamicObservableObjectProxyTraps = {
  has(target: any, name: any) {
    if (isReservedKey(name)) return true;
    const adm = getAdm(target);
    if (adm.values.get(name as string)) return true;
    if (typeof name === "string") return adm.has(name);
    return (name as any) in target;
  },
  get(target: any, name: any) {
    if (isReservedKey(name)) return target[name];
    const adm = getAdm(target);
    const observable = adm.values.get(name as string);
    if (observable && isFunction(observable.get)) return (observable as any).get();
    // make sure we start listening to future keys
    // note that we only do this here for optimization
    if (typeof name === "string") adm.has(name);
    return target[name];
  },
  set(target: any, name: any, value: any) {
    if (typeof name !== "string") return false;
    value = defaultEnhancer(value);

    if (hasTreeNode(value)) {
      const childTreeNode = value[$treenode];
      childTreeNode.setParent(target[$treenode], name);
    }

    set(target, name, value);
    return true;
  },
  deleteProperty(target: any, name: any) {
    if (typeof name !== "string") return false;
    const adm = getAdm(target);
    adm.remove(name);
    return true;
  },
  ownKeys(target: any) {
    const adm = getAdm(target);
    adm.keysAtom.reportObserved();
    return Reflect.ownKeys(target);
  },
  preventExtensions(target?: any) {
    console.log(`[MSC ReactiveNode] Dynamic observable objects cannot be frozen`);
    return false;
  }
};

export default abstract class ReactiveNode {
  [$treenode]: TreeNode;

  constructor(initState?: any) {
    // 1. reactivate, decorate ALL instance getters and methods with @computed, and @action
    reactivatePrototype(this.constructor);
    // 2. assign this[$mobx], for later usage
    const self = extendObservable(this, {});
    // 3. assing this[$treenode], for tree state management
    self[$treenode] = new TreeNode();
    // 4. Proxy(self), to mimic the dynamicObservableObject behavior
    const proxy = new Proxy(self, dynamicObservableObjectProxyTraps);
    // 5. keep internal ref of the instance
    self[$mobx].proxy = proxy;
    self[$treenode].storedValue = proxy;
    // 6. copy initState props to instance
    if (initState) Object.assign(proxy, initState);
    return proxy;
  }

  get parent() {
    return this[$treenode].parent.storedValue;
  }

  get isRoot() {
    return this[$treenode].isRoot;
  }

  get path() {
    return this[$treenode].path;
  }

  get root() {
    return this[$treenode].root.storedValue;
  }
}
