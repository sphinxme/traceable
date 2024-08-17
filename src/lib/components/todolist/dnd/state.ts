import { writable } from "svelte/store";

export const draggingTaskId = writable('');

export type TaskDnDData = {
    originPanelId: string;
    draggingTaskId: string;
    originParentTaskId: string;
    originIndexInParent: number;
}