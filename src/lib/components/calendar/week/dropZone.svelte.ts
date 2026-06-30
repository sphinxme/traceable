/**
 * 日列拖放区 Svelte Actions
 *
 * 两种拖放机制并存，挂载在 DayGrid 的每个日列 div 上：
 * - dayDropZone:        interactjs 拖放区，供日历内部事件拖拽时检测悬停日列
 * - dayExternalDropZone: HTML5 DnD 拖放区，接收从 Todo 列表拖入的 Task
 */
import type { Action } from "svelte/action";
import interact from "interactjs";

import type { Task } from "$lib/states/meta/task.svelte";
import type { DragService } from "$lib/interaction/services/DragService.svelte";

/**
 * interactjs 拖放区：使日列可被 eventInteract 的 draggable 检测为放置目标。
 * 本身不处理 drop 逻辑（由 eventInteract 的 dragend 回调处理），
 * 仅用于 interactjs 的 dropzone 检测机制。
 */
export const dayDropZone: Action<HTMLDivElement> = (node) => {
	interact(node).dropzone({
		ondrop(_event) {},
	});
	return {
		destroy() {
			interact(node).unset();
		},
	};
};

type DayExternalDropZoneParams = {
	/** 全局拖拽服务（从中读取被拖拽的 Task） */
	drag: DragService;
	/** 拖拽悬停回调（实时更新预览位置） */
	onDragOver: (task: Task, topPx: number) => void;
	/** 拖拽结束回调（清除预览） */
	onDragEnd: () => void;
	/** 释放回调（创建新事件） */
	onDrop: (task: Task, topPx: number) => void;
};

/**
 * HTML5 DnD 拖放区：接收从 Todo 列表拖入的 Task。
 * onDragOver 实时更新预览位置，onDrop 创建新事件。
 */
export const dayExternalDropZone: Action<
	HTMLDivElement,
	DayExternalDropZoneParams
> = (node, { drag, onDragOver, onDragEnd, onDrop }) => {
	node.ondragover = (event) => {
		event.preventDefault();
		const data = drag.data;
		if (!data) {
			return;
		}
		onDragOver(data.task, event.offsetY);
	};
	node.ondragend = (event) => {
		event.preventDefault();
		onDragEnd();
	};
	node.ondrop = (event) => {
		event.preventDefault();
		const data = drag.data;
		if (!data) {
			return;
		}
		onDrop(data.task, event.offsetY);
	};
	return {
		destroy() {
			node.ondragover = null;
			node.ondragend = null;
			node.ondrop = null;
		},
	};
};
