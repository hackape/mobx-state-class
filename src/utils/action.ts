import addHiddenProp from "./addHiddenProp";
import { action } from "mobx";
import { startPromiseHijack, endPromiseHijack } from "./hijackPromiseThen";

type AnyFunc = (...args: any[]) => any;
export function createAction(fn: AnyFunc): AnyFunc;
export function createAction(actionName: string, fn: AnyFunc): AnyFunc;
export function createAction(actionName: any, fn?: any) {
  if (arguments.length === 1 && typeof actionName === "function") {
    fn = actionName;
    const wrapperFn = function() {
      startPromiseHijack();
      fn.apply(this, arguments);
      endPromiseHijack();
    };
    return action(wrapperFn);
  } else {
    const wrapperFn = function() {
      startPromiseHijack();
      fn.apply(this, arguments);
      endPromiseHijack();
    };
    return action(actionName, wrapperFn);
  }
}

export function defineNamedBoundAction(
  target: any,
  propertyName: string,
  actionName: string,
  fn: Function
) {
  addHiddenProp(
    target,
    propertyName,
    createAction(actionName, fn.bind(target))
  );
}

export function boundActionDecorator(target, propertyName, descriptor) {
  // conventional action name as "MyClass.method()"
  const actionName = `${target.constructor.name}.${propertyName}()`;

  if (descriptor) {
    // if (descriptor.value)
    // Typescript / Babel: @action.bound method() { }
    // also: babel @action.bound method = () => {}
    return {
      enumerable: false,
      configurable: true,
      get() {
        defineNamedBoundAction(
          this,
          propertyName,
          actionName,
          descriptor.value || descriptor.initializer.call(this)
        );
        return this[propertyName];
      },
      set: _ => {} // noop
    };
  }
}
