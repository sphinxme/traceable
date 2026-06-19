import type { Action } from "svelte/action";
import dayjs from "dayjs";
import interact from "interactjs";

import type { Event } from "$lib/states/meta/event.svelte";
import type { Task } from "$lib/states/meta/task.svelte";
import { eventbus } from "$lib/components/todolist/controller/eventbus";
import { roundToNearest15MinutesPixels } from "./geometry";

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
}

export const useEventInteract: Action<HTMLElement, UseEventInteractParams> = (
	node,
	p,
) => {
	let preStart = p.event.start;
	let preEnd = p.event.end;
	let preDuration = preStart - preEnd;

	let realTopOffset = p.getTopOffset();
	let realHeight = p.getEventHeight();

	const refesh = () => {
		preStart = p.event.start;
		preEnd = p.event.end;
		preDuration = preEnd - preStart;
		realTopOffset = p.getTopOffset();
		realHeight = p.getEventHeight();
	};

	interact(node)
		.resizable({
			invert: "reposition",
			autoScroll: false,
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

					const newPreviewStart =
						(newTopOffset / p.getDayHeight()) *
							24 *
							60 *
							60 *
							1000 +
						targetDayStartTs;
					p.setPreviewStart(newPreviewStart);
					p.setPreviewEnd(newPreviewStart + preDuration);
				},
				end(dragEvent) {
					node.style.opacity = "75%";
					const targetDayTs = Number(
						dragEvent.dropzone.target.dataset.dayts,
					);
					const startTempTs =
						(p.getTopOffset() / p.getDayHeight()) *
							(24 * 60 * 60 * 1000) +
						targetDayTs;
					const startTemp = dayjs(startTempTs)
						.startOf("minute")
						.valueOf();
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
};
