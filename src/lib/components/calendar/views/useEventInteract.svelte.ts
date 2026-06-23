import type { Action } from "svelte/action";
import dayjs from "dayjs";
import interact from "interactjs";

import type { Event } from "$lib/states/meta/event.svelte";
import type { Task } from "$lib/states/meta/task.svelte";
import { eventbus } from "$lib/components/todolist/controller/eventbus";
import { roundToNearest15MinutesPixels } from "./geometry";

/**
 * WeekEvent.svelte 传给 useEventInteract action 的参数集。
 *
 * 设计要点：
 * - 通过 getter/setter 闭包而非直接传值，使 interact.js 回调
 *   能实时读写 WeekEvent 的 $state（topOffset / eventHeight 等），
 *   同时拖拽结束后能调用 event.moveTo / event.resizeTo 提交到 Yjs。
 * - getSegStart / isLast 是跨天支持新增的字段：
 *   getSegStart 返回当前 segment 的 segStart，用于计算 dragOffset。
 *   isLast 控制是否允许底部 resize（只有事件最后一个 segment 可改 end）。
 */
export interface UseEventInteractParams {
	event: Event;
	task: Task;
	getDayHeight: () => number;
	getSnapsOffset: () => number[];
	getColumnIndex: (t: number) => number;
	getTopOffset: () => number;
	getEventHeight: () => number;
	setTopOffset: (v: number) => void;
	setEventHeight: (v: number) => void;
	setColumnIndex: (v: number) => void;
	setPreviewStart: (v: number) => void;
	setPreviewEnd: (v: number) => void;
	setIsResizing: (v: boolean) => void;
	bumpClickCount: () => number;
	/** 当前 segment 的 segStart 时间戳，用于计算拖拽偏移 */
	getSegStart: () => number;
	/** 是否是事件的最后一个 segment，控制底部 resize 是否可用 */
	isLast: boolean;
}

export const useEventInteract: Action<HTMLElement, UseEventInteractParams> = (
	node,
	p,
) => {
	let preStart = p.event.start;
	let preEnd = p.event.end;
	let preDuration = preEnd - preStart;

	/**
	 * 拖拽偏移量：segment.segStart 与 event.start 的时间差。
	 *
	 * 跨天事件被切分为多个 segment 后，拖拽任意一个 segment 时，
	 * 用户鼠标位置对应的是 segStart 而非 event.start。
	 * 通过 dragOffset = segStart - event.start，可以将鼠标时间
	 * 还原为事件实际应有的新 start：newEventStart = cursorTime - dragOffset。
	 *
	 * 这样 event.moveTo(newEventStart) 会整体平移整个事件，
	 * 其他 segment 由布局引擎自动跟随重新计算。
	 */
	let dragOffset = 0;

	let realTopOffset = p.getTopOffset();
	let realHeight = p.getEventHeight();

	const refesh = () => {
		preStart = p.event.start;
		preEnd = p.event.end;
		preDuration = preEnd - preStart;
		realTopOffset = p.getTopOffset();
		realHeight = p.getEventHeight();
		dragOffset = p.getSegStart() - preStart;
	};

	interact(node)
		.resizable({
			invert: "reposition",
			autoScroll: false,
			// 只有事件的最后一个 segment 才能从底部 resize（改变 event.end）。
			// 中间 segment 不可 resize，否则会破坏事件的时间连续性。
			enabled: p.isLast,
			edges: {
				bottom: true,
			},
			listeners: {
				start(dragEvent) {
					p.setIsResizing(true);
					refesh();
					node.style.opacity = "50%";
				},
				move(dragEvent) {
					const heightPx = dragEvent.rect.height;
					p.setEventHeight(heightPx);
					p.setPreviewEnd(
						preStart +
							(heightPx / p.getDayHeight()) * 24 * 60 * 60 * 1000,
					);
				},
				end(dragEvent) {
					p.setIsResizing(false);
					node.style.opacity = "75%";
					const duration =
						(24 * 60 * 60 * 1000 * p.getEventHeight()) /
						p.getDayHeight();
					p.event.resizeTo(duration);
				},
			},
		})
		.draggable({
			listeners: {
				start(dragEvent) {
					node.style.opacity = "50%";
					refesh();
				},
			move(dragEvent) {
					// 从 dropzone 的 dataset.dayts 获取当前悬停的日列起始时间戳
					const targetDayStartTs = Number(
						dragEvent.dropzone.target.dataset.dayts,
					);
					p.setColumnIndex(p.getColumnIndex(targetDayStartTs));
					realTopOffset += dragEvent.dy;
					const newTopOffset = roundToNearest15MinutesPixels(
						p.getSnapsOffset(),
						realTopOffset,
					);
					p.setTopOffset(newTopOffset);

					// 鼠标位置对应的时间 = 当天列内偏移 + 日列起始
					const cursorTime =
						(newTopOffset / p.getDayHeight()) *
							24 *
							60 *
							60 *
							1000 +
						targetDayStartTs;
					// 还原为事件实际 start（整体平移，保持各 segment 相对关系）
					const newPreviewStart = cursorTime - dragOffset;
					p.setPreviewStart(newPreviewStart);
					p.setPreviewEnd(newPreviewStart + preDuration);
				},
				end(dragEvent) {
					node.style.opacity = "75%";
					const targetDayTs = Number(
						dragEvent.dropzone.target.dataset.dayts,
					);
					// 计算鼠标最终位置对应的时间，减去 dragOffset 还原为事件 start
					const cursorTime =
						(p.getTopOffset() / p.getDayHeight()) *
							(24 * 60 * 60 * 1000) +
						targetDayTs;
					const startTemp = dayjs(cursorTime - dragOffset)
						.startOf("minute")
						.valueOf();
					// 整体平移事件，其他 segment 由布局引擎自动跟随
					p.event.moveTo(startTemp);
				},
			},
		})
		.on("tap", (e) => {
			const clickCount = p.bumpClickCount();
			eventbus.emit("clickOnWeekEvent", {
				event: p.event,
				task: p.task,
				clickCount,
			});
		});

	/**
	 * Svelte action 的 update 回调：当 segment 变化时重新同步参数。
	 *
	 * 关键：interact.js 的 resizable 需要 enabled 随 isLast 动态变化，
	 * 否则跨天事件拖到新位置后 isLast 可能改变但 resize 权限不会更新。
	 */
	return {
		update(newP: UseEventInteractParams) {
			p = newP;
			interact(node).resizable({ enabled: p.isLast });
		},
	};
};
