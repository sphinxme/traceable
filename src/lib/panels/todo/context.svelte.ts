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
        return () => {
            const list = register.get(taskId);
            if (!list) {
                return;
            }

            const index = list.indexOf(state)
            if (index < 0) {
                return;
            }
            list.splice(index, 1);
        }
    });
    return register;
}

export function getRegisterFromContext(): (state: EditorItemState) => (() => void) {
    const register = getContext("registerTodoItem") as ((state: EditorItemState) => (() => void)) | undefined;
    if (!register) {
        return () => {
            return () => { }
        };
    }
    return register;
}