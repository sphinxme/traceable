import type { Task } from "$lib/states/meta/task.svelte";
import type { StateStore } from "$lib/states/states/StatesTree.svelte";

export interface DraggingTaskData {
	originPanelId: string;
	originViewId: string;
	originParent: Task;
	task: Task;
	states: StateStore;
}

export class DragService {
	public data: DraggingTaskData | undefined = $state(undefined);
	public active: boolean = $state(false);

	public set(data: DraggingTaskData) {
		this.data = data;
		this.active = true;
	}

	public clear() {
		this.data = undefined;
		this.active = false;
	}

	public destroy() {}
}
