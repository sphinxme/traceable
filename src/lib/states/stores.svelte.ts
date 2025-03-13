import type Todo from "$lib/components/todolist/Todo.svelte";

export const highlightFEventIds: Record<string, boolean> = $state({});
export const foucsingEventIds: Record<string, boolean> = $state({});

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