import type { Task } from "$lib/states/meta/task.svelte";
import type { StateStore } from "$lib/states/states/StatesTree.svelte";

/**
 * 拖拽中的任务数据 — 由拖拽源面板填充，供拖拽目标面板读取。
 *
 * @property originPanelId 源面板 ID
 * @property originViewId  源视图 ID
 * @property originParent  源父任务
 * @property task          被拖拽的任务
 * @property states        所属的状态树存储
 */
export interface DraggingTaskData {
	originPanelId: string;
	originViewId: string;
	originParent: Task;
	task: Task;
	states: StateStore;
}

/**
 * 拖拽服务 — 管理拖拽状态，协调跨面板拖放。
 *
 * 拖拽开始时由源面板调用 {@link set} 写入拖拽数据，
 * 拖拽结束（drop / cancel）时由目标面板调用 {@link clear} 清除。
 *
 * `data` 和 `active` 均为 `$state`，消费者可响应式读取以驱动 UI 反馈。
 */
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
