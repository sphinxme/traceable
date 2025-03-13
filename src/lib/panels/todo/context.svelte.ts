import type { EditorItemState } from "$lib/states/states/panel_states";
import { getContext, setContext } from "svelte";

export function initRegister() {
    const register = new Map<string, EditorItemState[]>();
    setContext("registerTodoItem", (state: EditorItemState) => {
        const taskId = state.task.id;
        if (!register.get(taskId)) {
            register.set(taskId, []);
        }
        register.get(taskId)?.push(state);
    });
    return register;
}

export function getRegisterFromContext(): (state: EditorItemState) => void {
    const register = getContext("registerTodoItem") as ((state: EditorItemState) => void) | undefined;
    if (!register) {
        return () => { };
    }
    return register;
}