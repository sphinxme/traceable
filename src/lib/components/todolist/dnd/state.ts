import type { TaskProxy } from "$lib/states/rxdb";
import { writable } from "svelte/store";

export const draggingTaskId = writable("");

export type TaskDnDData = {
    originPanelId: string;
    draggingTaskId: string;
    originParentTask: TaskProxy;
};
