import type { TaskProxy } from "$lib/states/meta/task.svelte";
import type { KeyboardHandler } from "../quill/model";
import type Todo from "./Todo.svelte"
import type TodoList from "./TodoList.svelte"

interface KeyboardController {
    arrowUpHandle?: KeyboardHandler;
    arrowDownHandle?: KeyboardHandler;
    enterHandle?: KeyboardHandler;
    // tabHandle?: (child: TaskProxy, stateMap: StateMap) => boolean;
    // untabHandle?: any;
}

export {
    type Todo,
    type TodoList
}