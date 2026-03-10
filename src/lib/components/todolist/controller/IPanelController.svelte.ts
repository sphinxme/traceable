import type { Task } from "$lib/states/meta/task.svelte";

export interface PanelController {
    readonly id: string;
    zoomable(): boolean;
    pushPaths(childPaths: Task[]): void;
}