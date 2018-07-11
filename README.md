# mobx-state-class

mobx-state-class is a state management lib built on top of the awesome MobX lib, heavily inspired by mobx-state-tree project.

## Introduction

mobx-state-class (abbr. MSC) is just a syntax sugar layer to the original MobX APIs. Thus familiarity with MobX is a prerequisite.

MSC is built around MobX's class decorators. By extending MSC's `ReactiveNode` base class, it automatically applies `@observable` to all class properties, `@computed` to all getters, and `@action` to all methods.

This effectively frees you from the worry of forgetting to apply the correct decorator from time to time, which is a typical gotcha when working with MobX. Such approach lets you focus more on your own business logics, and your code also looks cleaner without all those annotations.

By design MSC embraces a convention-over-configuration approach. It offers no way to configure at all. Anytime you feel you need some fine grain controls, just turn back to original MobX APIs. Remember, MSC is just syntax sugar.

## Requirement

MSC is implemented with ES7 Proxy, and is compatible with MobX v5+ only, you need to ensure MobX exists in your project as peer dependency.

## Usage

### Basic Usage

MSC assumes you write your state tree node with ES6 class syntax. It provides a `ReactiveNode` base class for you to extend. You just need to extend `ReactiveNode`, forget about MobX and write your code like normal js.

```js
class TodoModel extends ReactiveNode {
  constructor(initialState) {
    const { todos } = initialState;
    super();
    this.todos = todos;
  }

  get completedTodos() {
    return this.todos.filter(todo => todo.completed);
  }

  addTodo(title) {
    this.todos.push({ title, completed: false });
  }

  async fetch(params) {
    this.todos = await api.fetchTodos(params);
  }
}
```

Above code is (almost) equivalent to below.

```js
class TodoModel {
  @observable todos;

  constructor(initialState) {
    const { todos } = initialState;
    this.todos = todos;
  }

  @computed
  get completedTodos() {
    return this.todos.filter(todo => todo.completed);
  }

  @action.bound
  addTodo(title) {
    this.todos.push({ title, completed: false });
  }

  fetch: mobx.flow(function* (params) {
    this.todos = yield api.fetchTodos(params);
  })
}
```

As seen in example, class methods are automatically converted to bound actions, and async function is also taken cared (this trick actually involves hacking `Promise.prototype.then`, it's not clean, but worth it).

All conversions happen in runtime, no transpiler required.

### Tree Node Properties

MSC borrows the concept of "tree" from mobx-state-tree project. It provides a set of lightweight APIs to help you work with tree relationship.

`ReactiveNode` class implements 4 hidden properties (actually they are getters):

- `.parent`
- `.path`
- `.root`
- `.isRoot`

Tree node object's class definition typically locates in seperate files. These properties help you access other related node from within one node without the need to import that file.

If you organize your state tree node in a single-state-tree fashion, then you can easily get the global app state by accessing `.root`.

Example:

```js
// app-state.js
import Todo from "todo";

class AppState extends ReactiveNode {
  constructor() {
    super();
    this.todos = [new Todos()];
  }

  printIsRoot() {
    console.log(this.isRoot); // "true"
  }

  printPath() {
    console.log(this.path); // ""
  }

  printParent() {
    console.log(this.parent); // will log "null"
  }

  printAppState() {
    console.log(this.root); // will log appState itself
  }
}
```

```js
// todo.js
class Todo extends ReactiveNode {
  printIsRoot() {
    console.log(this.isRoot); // "false"
  }

  printPath() {
    console.log(this.path); // "todos/0"
  }

  printParent() {
    console.log(this.parent); // will log appState.todos
  }

  printAppState() {
    console.log(this.root); // will log appState
  }
}
```

### Array and Map

Like MobX, MSC provides support to array and map. Anytime an array or a map gets attached to a ReactiveNode as class member, it'll be injected with all 4 tree node properties (`.parent`, `.path`, `.root`, `.isRoot`). It'll also receive an interceptor that handles updating tree relationships and other weight lifting like runtime conversion. Apart from these, they're basically plain MobX Observable Array/Map.
