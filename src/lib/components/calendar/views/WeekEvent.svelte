<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import dayjs, { type Dayjs } from 'dayjs';
	import interact from 'interactjs';

	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';

	import { Database } from '$lib/states/db';
	import { highlightFEventIds } from '$lib/states/stores';
	import { yStore } from '$lib/states/ystore';
	import { percent } from './utils';

	const db = getContext<Database>('db');

	export let dayHeight: number;

	export let event: Readonly<{
		id: string;
		isCompleted: boolean;
		start: number;
		end: number;
	}>;
	export let textId: string;
	export let getColumnIndex: (t: number) => number;
	export let calculateTopOffset: (start: number) => number;
	export let calculateEventHeight: (start: number, end: number) => number;

	const calculateTopOffset2 = (start: number): number => {
		const startOfDay = dayjs(start).startOf('day');
		const result = Math.floor(percent(startOfDay.valueOf(), start) * dayHeight);
		return result;
	};
	const calculateEventHeight2 = (start: number, end: number): number => {
		return Math.floor(percent(start, end) * dayHeight);
	};

	$: topOffset = calculateTopOffset2(event.start); // 单位px
	$: eventHeight = calculateEventHeight2(event.start, event.end); // 单位px
	let columnIndex = getColumnIndex(event.start);

	$: text = yStore(db.texts.get(textId));

	let highlight = highlightFEventIds.has(event.id);
	onMount(() => {
		const unsubscribe = highlightFEventIds.subscribe((set) => {
			highlight = set.has(event.id);
		});
		return () => {
			unsubscribe();
		};
	});

	function roundToNearest1Minutes(time: Dayjs) {
		if (time.second() > 30) {
			time = time.add(1, 'minute');
		}
		return time.startOf('minute').valueOf();
	}

	const onDeleteMyself = () => {
		db.instant.transact([db.instant.tx.events[event.id].delete()]);
	};
	const updateMyselfPeriod = (start: number, end: number) => {
		console.log({ updated: { start, end } });
		db.instant
			.transact([db.instant.tx.events[event.id].update({ start, end })])
			.then((v) => {
				console.log({ v });
			})
			.catch((reason) => {
				console.log({ reason });
			});
	};
	let container: HTMLDivElement;

	onMount(() => {
		let preStart = event.start;
		let preEnd = event.end;
		interact(container)
			.resizable({
				invert: 'reposition',
				autoScroll: false,
				edges: {
					bottom: true
					// top: true,
				},
				listeners: {
					start(dragEvent) {
						preStart = event.start;
						preEnd = event.end;
						container.style.opacity = '50%';
					},
					move(dragEvent) {
						let heightPx = dragEvent.rect.height;
						eventHeight = heightPx;
						end = event.start + (heightPx / dayHeight) * 24 * 60 * 60 * 1000;
						// const duration = (24 * 60 * 60 * 1000 * heightPx) / dayHeight;
						// const endTemp = start + duration;
						// end = roundToNearest1Minutes(dayjs(endTemp));
						// node.style.height = event.rect.height+'px';
					},
					end(dragEvent) {
						container.style.opacity = '75%';
						const duration = (24 * 60 * 60 * 1000 * eventHeight) / dayHeight;
						const endTemp = event.start + duration;
						const end = roundToNearest1Minutes(dayjs(endTemp));
						if (end != event.end) {
							updateMyselfPeriod(event.start, end);
						}
					}
				}
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
						container.style.opacity = '50%';
						preStart = event.start;
						preEnd = event.end;
					},
					move(dragEvent) {
						const targetDayElem = dragEvent.dropzone.target;
						const targetDayStartTs = Number(targetDayElem.dataset.dayts);
						columnIndex = getColumnIndex(targetDayStartTs);
						topOffset += dragEvent.dy;

						const duration = event.end - event.start;
						start = (topOffset / dayHeight) * 24 * 60 * 60 * 1000 + targetDayStartTs;
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
						container.style.opacity = '75%';
						const targetDayElem = dragEvent.dropzone.target;
						const targetDayTs = Number(targetDayElem.dataset.dayts);
						const startTempTs = (topOffset / dayHeight) * (24 * 60 * 60 * 1000) + targetDayTs;
						const startTemp = dayjs(startTempTs).startOf('minute').valueOf();
						if (startTemp != event.start) {
							const duration = event.end - event.start;
							updateMyselfPeriod(startTemp, startTemp + duration);
						}
					}
				}
			});
	});

	// 仅用于事件的展示, 在移动过程中会被offsetTop的即时值替换
	$: start = event.start;
	$: end = event.end;
</script>

<div
	bind:this={container}
	style:z-index="8"
	class="absolute w-full grow-0 overflow-hidden rounded-lg {event.isCompleted
		? 'bg-slate-400'
		: 'bg-slate-600'} p-1 text-sm text-slate-50 opacity-75 {highlight
		? 'p-0 shadow-2xl shadow-slate-700'
		: 'shadow-lg'}"
	style:grid-row="3"
	style:grid-column="{columnIndex + 2} / {columnIndex + 2}"
	style:top="{topOffset}px"
	style:height="{eventHeight}px"
>
	<Tooltip.Root openDelay={0} closeDelay={100}>
		<Tooltip.Trigger class="h-full w-full">
			<ContextMenu.Root>
				<ContextMenu.Trigger class="flex h-full w-full flex-col">
					<div class=" text-xs font-extralight">
						{dayjs(start).format('HH:mm')}-{dayjs(end).format('HH:mm')}
					</div>
					<div class="line-clamp-3 text-wrap">{$text}</div>
				</ContextMenu.Trigger>
				<ContextMenu.Content>
					<ContextMenu.Item on:click={onDeleteMyself}>删除</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p class=" text-wrap">{$text}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</div>
