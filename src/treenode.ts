import { observable, computed, action } from "mobx";

export const $treenode = Symbol("$treenode");

export interface INode {
  storedValue: any;
  subpath: string;
  readonly path: string;
  readonly parent: INode;
  readonly isRoot: boolean;
  readonly root: INode;
}

let nextNodeId = 1;
export class TreeNode implements INode {
  nodeId = ++nextNodeId;
  storedValue;
  @observable subpath = "";
  @observable _parent = (null as any) as INode;

  @computed
  get isRoot(): boolean {
    return this.parent === null;
  }

  @computed
  get parent(): INode {
    return this._parent;
  }

  @action
  setParent(newParent: INode, subpath: string | null = null) {
    if (this.parent === newParent && this.subpath === subpath) return;
    if (newParent) {
      if (this._parent && newParent !== this._parent) {
        throw new Error(
          `A node cannot exists twice in the state tree. Failed to add ${this} to path '${
            newParent.path
          }/${subpath}'.`
        );
      }
      if (!this._parent && newParent.root === this) {
        throw new Error(
          `A state tree is not allowed to contain itself. Cannot assign ${this} to path '${
            newParent.path
          }/${subpath}'`
        );
      }
    }

    if (!this.parent && !newParent) {
      // noop
    } else {
      this.subpath = subpath || "";
      if (newParent && newParent !== this._parent) {
        this._parent = newParent;
      }
    }
  }

  @action
  setSubpath(subpath: string) {
    this.subpath = subpath;
  }

  @computed
  get path(): string {
    if (!this.parent) return "";
    return this.parent.path + "/" + this.subpath;
  }

  @computed
  get root(): INode {
    let p;
    let r = this;
    while ((p = r.parent)) r = p;
    return r as INode;
  }
}

export function addTreeNodeAdministration(target) {
  if (target[$treenode]) return target;

  target[$treenode] = new TreeNode();
  const treenodeProxyAPIs = {
    parent: function getParent() {
      return this[$treenode].parent.storedValue;
    },

    isRoot: function getIsRoot() {
      return this[$treenode].isRoot;
    },

    path: function getPath() {
      return this[$treenode].path;
    },

    root: function getRoot() {
      return this[$treenode].root.storedValue;
    }
  };

  Object.keys(treenodeProxyAPIs).forEach(key => {
    Object.defineProperty(target, key, {
      enumerable: false,
      configurable: true,
      get: treenodeProxyAPIs[key]
    });
  });

  self[$treenode].storedValue = target;
  return target;
}
