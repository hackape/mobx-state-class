import { createAction } from "./action";

const internalState = { flag: 0, actionNames: [] as string[] };
(window as any).__checkHijackPromiseFlag__ = () => {
  console.log("[flag]", internalState);
};

export const startPromiseHijack = (actionName: string) => {
  internalState.flag++;
  internalState.actionNames.push(actionName);
};

export const endPromiseHijack = () => {
  internalState.flag--;
  internalState.actionNames.pop();
};

const awaitActionNamePattern = /\(\) await (\d+)$/g;
const getAwaitActionName = (actionName: string) => {
  if (actionName.endsWith("()")) {
    return `${actionName} await 0`;
  } else {
    return actionName.replace(awaitActionNamePattern, (__, stepId) => {
      return `() await ${Number(stepId) + 1}`;
    });
  }
};

const originalThen = Promise.prototype.then;
Promise.prototype.then = function(fulfilled, rejected) {
  if (internalState.flag > 0) {
    const actionName =
      internalState.actionNames[internalState.actionNames.length - 1];
    if (typeof fulfilled === "function") {
      fulfilled = createAction(getAwaitActionName(actionName), fulfilled);
    }
    if (typeof rejected === "function") {
      rejected = createAction(getAwaitActionName(actionName), rejected);
    }
    return originalThen.apply(this, [fulfilled, rejected]);
  } else {
    return originalThen.apply(this, arguments);
  }
};
