import type { Task } from "$lib/states/meta/task.svelte";
import type { InteractionContext } from "$lib/interaction/context.svelte";

export interface PanelController {
	readonly id: string;
	readonly interaction: InteractionContext;
	zoomable(): boolean;
	pushPaths(childPaths: Task[]): void;
}