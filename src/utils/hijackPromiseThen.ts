import { createAction } from "./action";

const internalState = { flag: 0, actionNames: [] };
(window as any).__checkHijackPromiseFlag__ = () => {
  console.log("[flag]", internalState);
};

export const startPromiseHijack = () => {
  internalState.flag++;
};

export const endPromiseHijack = () => {
  internalState.flag--;
};

const originalThen = Promise.prototype.then;
Promise.prototype.then = function(fulfilled, rejected) {
  if (internalState.flag > 0) {
    if (typeof fulfilled === "function") fulfilled = createAction(fulfilled);
    if (typeof rejected === "function") rejected = createAction(rejected);
    return originalThen.apply(this, [fulfilled, rejected]);
  } else {
    return originalThen.apply(this, arguments);
  }
};
