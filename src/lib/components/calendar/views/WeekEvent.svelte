<script lang="ts">
	import { getContext, onMount } from "svelte";
	import dayjs, { type Dayjs } from "dayjs";
	import interact from "interactjs";

	import * as ContextMenu from "$lib/components/ui/context-menu";
	import * as Tooltip from "$lib/components/ui/tooltip";

	import {
		Database,
		type EventProxy,
		type TaskProxy,
	} from "$lib/states/rxdb";
	import { highlightFEventIds } from "$lib/states/stores.svelte";
	import { percent } from "./utils.svelte";
	import type { Observable } from "rxjs";

	const db = getContext<Database>("db");

	interface Props {
		dayHeight: number;
		event: Observable<EventProxy>;
		task: Observable<TaskProxy>;
		offsetByHour: number;
		getColumnIndex: (t: number) => number;
	}

	let { dayHeight, event, task, offsetByHour, getColumnIndex }: Props =
		$props();

	const calculateTopOffset2 = (start: number): number => {
		const startOfDay = dayjs(start)
			.add(-offsetByHour, "hour")
			.startOf("day")
			.add(offsetByHour, "hour");
		const result = Math.floor(
			percent(startOfDay.valueOf(), start) * dayHeight,
		);
		return result;
	};
	const calculateEventHeight2 = (start: number, end: number): number => {
		return Math.floor(percent(start, end) * dayHeight);
	};

	let topOffset = $state(calculateTopOffset2($event.start)); // 单位px
	let eventHeight = $state(calculateEventHeight2($event.start, $event.end)); // 单位px
	let columnIndex = $state(getColumnIndex($event.start));

	let text = $task.text();
	let highlight = $derived(highlightFEventIds[$event.id]);

	function roundToNearest1Minutes(time: Dayjs) {
		if (time.second() > 30) {
			time = time.add(1, "minute");
		}
		return time.startOf("minute").valueOf();
	}

	const onDeleteMyself = () => {
		$event.remove();
	};
	const updateMyselfPeriod = (start: number, end: number) => {
		console.log({ updated: { start, end } });
		$event.patch({ start, end });
	};
	let container: HTMLDivElement;

	onMount(() => {
		let preStart = $event.start;
		let preEnd = $event.end;
		interact(container)
			.resizable({
				invert: "reposition",
				autoScroll: false,
				edges: {
					bottom: true,
					// top: true,
				},
				listeners: {
					start(dragEvent) {
						preStart = $event.start;
						preEnd = $event.end;
						container.style.opacity = "50%";
					},
					move(dragEvent) {
						let heightPx = dragEvent.rect.height;
						eventHeight = heightPx;
						end =
							preStart +
							(heightPx / dayHeight) * 24 * 60 * 60 * 1000;
						// const duration = (24 * 60 * 60 * 1000 * heightPx) / dayHeight;
						// const endTemp = start + duration;
						// end = roundToNearest1Minutes(dayjs(endTemp));
						// node.style.height = event.rect.height+'px';
					},
					end(dragEvent) {
						container.style.opacity = "75%";
						const duration =
							(24 * 60 * 60 * 1000 * eventHeight) / dayHeight;
						const endTemp = preStart + duration;
						const end = roundToNearest1Minutes(dayjs(endTemp));
						if (end != preEnd) {
							updateMyselfPeriod(preStart, end);
						}
					},
				},
			})
			.draggable({
				// modifiers: [
				//     interact.modifiers.snap({
				//       targets: [
				//         interact.snappers.grid({ x: 1, y: 24 })
				//       ],
				//       range: Infinity,
				//       relativePoints: [ { x: 0, y: 0 } ]
				//     })
				//   ],

				listeners: {
					start(dragEvent) {
						container.style.opacity = "50%";
						preStart = $event.start;
						preEnd = $event.end;
					},
					move(dragEvent) {
						const targetDayElem = dragEvent.dropzone.target;
						const targetDayStartTs = Number(
							targetDayElem.dataset.dayts,
						);
						columnIndex = getColumnIndex(targetDayStartTs);
						topOffset += dragEvent.dy;

						const duration = preEnd - preStart;
						start =
							(topOffset / dayHeight) * 24 * 60 * 60 * 1000 +
							targetDayStartTs;
						end = start + duration;

						// node.style.gridColumnStart=String(parseInt(getComputedStyleColNum(targetDay))+1) // 因为子网格跟外面网格不一致 所以+1;
						// const startDay = dayjs(parseInt(targetDay.dataset.dayts));

						// const duration = event.end - event.start;
						// let startTemp = day.add(24 * 60 * 60 * 1000 * (topPx / dayHeight), 'milliseconds');
						// // 吸附
						// start = roundToNearest1Minutes(startTemp);
						// end = start + duration;
					},
					end(dragEvent) {
						container.style.opacity = "75%";
						const targetDayElem = dragEvent.dropzone.target;
						const targetDayTs = Number(targetDayElem.dataset.dayts);
						const startTempTs =
							(topOffset / dayHeight) * (24 * 60 * 60 * 1000) +
							targetDayTs;
						const startTemp = dayjs(startTempTs)
							.startOf("minute")
							.valueOf();
						if (startTemp != preStart) {
							const duration = preEnd - preStart;
							updateMyselfPeriod(startTemp, startTemp + duration);
						}
					},
				},
			});
	});

	// 仅用于事件的展示, 在移动过程中会被offsetTop的即时值替换
	let start = $derived($event.start); // TODO:能不能不要这个了
	let end = $derived($event.end);
</script>

<div
	bind:this={container}
	style:z-index="8"
	class="absolute w-full grow-0 overflow-hidden rounded-lg {$task.isCompleted
		? 'bg-slate-400'
		: 'bg-slate-600'} p-1 text-sm text-slate-50 opacity-75 {highlight
		? 'p-0 shadow-2xl shadow-slate-700'
		: 'shadow-lg'}"
	style:grid-row="3"
	style:grid-column="{columnIndex + 2} / {columnIndex + 2}"
	style:top="{topOffset}px"
	style:height="{eventHeight}px"
>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={0}>
			<Tooltip.Trigger class="h-full w-full">
				<ContextMenu.Root>
					<ContextMenu.Trigger class="flex h-full w-full flex-col">
						<div class=" text-xs font-extralight">
							{dayjs(start).format("HH:mm")}-{dayjs(end).format(
								"HH:mm",
							)}
						</div>
						<div class="line-clamp-3 text-wrap">{$text}</div>
					</ContextMenu.Trigger>
					<ContextMenu.Content>
						<ContextMenu.Item onclick={onDeleteMyself}>
							删除
						</ContextMenu.Item>
					</ContextMenu.Content>
				</ContextMenu.Root>
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p class=" text-wrap">{$text}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
