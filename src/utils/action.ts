import { action } from "mobx";
import { startPromiseHijack, endPromiseHijack } from "./hijackPromiseThen";

type AnyFunc = (...args: any[]) => any;
export function createAction(fn: AnyFunc): AnyFunc;
export function createAction(actionName: string, fn: AnyFunc): AnyFunc;
export function createAction(actionName: any, fn?: any) {
  if (arguments.length === 1) {
    fn = actionName;
    actionName = "anonymousAction()";
    return createAction(actionName, fn);
  }

  const wrapperFn = function() {
    startPromiseHijack(actionName);
    fn.apply(this, arguments);
    endPromiseHijack();
  };
  return action(actionName, wrapperFn);
}

export function defineNamedBoundAction(
  target: any,
  propertyName: string,
  actionName: string,
  fn: Function
) {
  Object.defineProperty(target, propertyName, {
    enumerable: false,
    writable: true,
    configurable: true,
    value: createAction(actionName, fn.bind(target))
  });
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
