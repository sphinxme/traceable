/**
 * Todo 大纲组件的类型定义。
 *
 * 目前主要导出 `Todo` 和 `TodoList` 组件类型，
 * 供外部组件在类型注解中引用。
 */
import type { Task } from "$lib/states/meta/task.svelte";
import type { KeyboardHandler } from "../quill/model";
import type Todo from "./Todo.svelte"
import type TodoList from "./TodoList.svelte"

/**
 * 键盘控制器接口（未使用，预留）。
 *
 * 原计划用于注册自定义键盘处理函数，
 * 当前键盘逻辑已迁移到 `TodoKeyboardActions`。
 */
interface KeyboardController {
    arrowUpHandle?: KeyboardHandler;
    arrowDownHandle?: KeyboardHandler;
    enterHandle?: KeyboardHandler;
    // tabHandle?: (child: Task, stateMap: StateMap) => boolean;
    // untabHandle?: any;
}

export {
    type Todo,
    type TodoList
}