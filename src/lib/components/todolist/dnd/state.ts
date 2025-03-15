import type { TaskProxy } from "$lib/states/meta/task.svelte";
import { writable } from "svelte/store";

export const draggingTaskId = writable("");

export type TaskDnDData = {
    originPanelId: string;
    draggingTask: TaskProxy;
    originParentTask: TaskProxy;
};
