/**
 * 事件块交互 Svelte Action
 *
 * interactjs 的薄包装：绑定 resizable / draggable / tap 事件，
 * 将回调委托给 WeekEventController 处理计算逻辑。
 * 挂载在 WeekEvent.svelte 的根 div 上。
 */
import type { Action } from "svelte/action";
import interact from "interactjs";

import type { Event } from "$lib/states/meta/event.svelte";
import type { Task } from "$lib/states/meta/task.svelte";
import type { WeekEventController } from "./WeekEventController.svelte"

/* eventInteract action 的参数 */
export interface EventInteractParams {
	/** 交互控制器（持有状态和计算逻辑） */
	ctrl: WeekEventController;
	/** 底层 Event 对象（跨天事件的多个 segment 共享同一引用） */
	event: Event;
	/** 关联的 Task（用于点击事件通知） */
	task: Task;
	/** 是否是事件的最后一个 segment（仅 last 可底部缩放） */
	isLast: boolean;
}

export const eventInteract: Action<HTMLElement, EventInteractParams> = (
	node,
	p,
) => {
	interact(node)
		// 底部缩放：只有事件的最后一个 segment 可缩放（改变 event.end）
		.resizable({
			invert: "reposition",
			autoScroll: false,
			enabled: p.isLast,
			edges: { bottom: true },
			listeners: {
				start() {
					p.ctrl.onResizeStart();
					node.style.opacity = "50%";
				},
				move(dragEvent) {
					p.ctrl.onResizeMove(dragEvent.rect.height);
				},
				end() {
					p.ctrl.onResizeEnd(p.event);
					node.style.opacity = "75%";
				},
			},
		})
		// 拖拽移动：实时更新预览位置，结束时调用 event.moveTo 整体平移
		.draggable({
			listeners: {
				start() {
					node.style.opacity = "50%";
					p.ctrl.refresh(p.event);
				},
				move(dragEvent) {
					// 从拖放目标日列的 dataset.dayts 读取时间戳
					const targetDayTs = Number(
						dragEvent.dropzone?.target?.dataset.dayts,
					);
					if (targetDayTs) {
						p.ctrl.onDragMove(dragEvent.dy, targetDayTs);
					}
				},
				end(dragEvent) {
					node.style.opacity = "75%";
					const targetDayTs = Number(
						dragEvent.dropzone?.target?.dataset.dayts,
					);
					if (targetDayTs) {
						p.ctrl.onDragEnd(p.event, targetDayTs);
					}
				},
			},
		})
		// 点击/双击：通过 eventbus 通知，双击跳转到对应 Task
		.on("tap", () => {
			p.ctrl.onTap(p.event, p.task);
		});

	return {
		/** segment 变化时更新 resize 权限（isLast 可能随拖拽位置变化） */
		update(newP: EventInteractParams) {
			p = newP;
			interact(node).resizable({ enabled: p.isLast });
		},
		destroy() {
			interact(node).unset();
		},
	};
};
