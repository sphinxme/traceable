import type Todo from "$lib/components/todolist/Todo.svelte";
import type { TaskProxy } from "./meta/task.svelte";

export const highlightFEventIds: Record<string, boolean> = $state({});
export const foucsingEventIds: Record<string, boolean> = $state({});

let transitioningPaths: TaskProxy[] = $state([]);
export const setTransitioningPaths = (paths: TaskProxy[]) => {
    transitioningPaths = [...paths];
}
export const checkTransitioningPaths = (absolutePaths: TaskProxy[]) => {
    if (absolutePaths.length !== transitioningPaths.length) {
        return false;
    }

    const result = absolutePaths.every(({ id }, index) => {
        return id === transitioningPaths.at(index)?.id;
    })

    return result;
}

export const taskTodoItems: Record<string, Todo[]> = $state({});
let highlightTaskId = "";
let highlightTaskItems: Todo[] = [];
export function focusOnNextTask(id: string) {
    if (highlightTaskId === id) {
        highlightTaskItems = rotateArrayRight(highlightTaskItems)
    } else {
        highlightTaskItems = taskTodoItems[id];
    }

    highlightTaskItems.at(1)?.focus(0);

}

// 循环右移数组
function rotateArrayRight<T>(arr: T[]) {
    if (arr.length <= 1) {
        return arr;
    }

    const first = arr.slice(0, 1);
    const left = arr.slice(1)
    return [...left, ...first]
}