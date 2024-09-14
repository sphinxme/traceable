<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import dayjs, { type Dayjs } from 'dayjs';

	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';

	import { Database } from '$lib/states/db';
	import { highlightFEventIds } from '$lib/states/stores';

	import { interact } from './interact';
	import { yStore } from '$lib/states/ystore';

	const db = getContext<Database>('db');

	export let dayHeight: number;

	export let event: {
		id: string;
		isCompleted: boolean;
		start: number;
		end: number;
	};
	export let textId: string;
	let start = event.start;
	let end = event.end;

	console.log({ textId });
	let text = yStore(db.texts.get(textId));

	export let getColumnIndex: (t: number) => number;
	export let calculateTopOffset: (start: number) => number;
	export let calculateEventHeight: (start: number, end: number) => number;

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

	/**
	 * 将给定的时间四舍五入到最近的15分钟倍数。
	 * @param {dayjs.Dayjs} time - 需要进行四舍五入的时间。
	 * @returns {dayjs.Dayjs} 四舍五入后的时间。
	 */
	function roundToNearest15Minutes(time: Dayjs) {
		// 获取当前分钟数
		const minutes = time.minute();

		// 计算距离最近的15分钟倍数的分钟数
		const remainder = minutes % 5;
		let roundedMinutes = minutes;

		// 如果剩余分钟数小于7.5分钟，则向下取整到最近的15分钟倍数
		// 如果剩余分钟数大于等于7.5分钟，则向上取整到最近的15分钟倍数
		if (remainder < 2.5) {
			roundedMinutes -= remainder;
		} else {
			roundedMinutes += 5 - remainder;
		}

		// 返回四舍五入后的时间
		return time.minute(roundedMinutes).second(0).millisecond(0).valueOf();
	}

	const onDeleteMyself = () => {
		db.instant.transact([db.instant.tx.events[event.id].delete()]);
	};
	const updateMyselfPeriod = (start: number, end: number) => {
		db.instant.transact([db.instant.tx.events[event.id].update({ start, end })]);
	};
</script>

<div
	use:interact={{
		onDropMove(day, topPx) {
			// const duration = event.end - event.start;
			// let startTemp = day.add(24 * 60 * 60 * 1000 * (topPx / dayHeight), 'milliseconds');
			// // 吸附
			// start = roundToNearest1Minutes(startTemp);
			// end = start + duration;
		},
		onDropEnd() {
			// const duration = event.end - event.start;
			// let startTemp = day.add(24 * 60 * 60 * 1000 * (topPx / dayHeight), 'milliseconds');
			// // 吸附
			// start = roundToNearest1Minutes(startTemp);
			// end = start + duration;
			updateMyselfPeriod(start, end);
		},
		onResizeMove(heightPx) {
			const duration = (24 * 60 * 60 * 1000 * heightPx) / dayHeight;
			const endTemp = start + duration;
			end = roundToNearest1Minutes(dayjs(endTemp));
		},
		onResizeEnd() {
			updateMyselfPeriod(start, end);
		}
	}}
	style:z-index="8"
	class="absolute w-full grow-0 overflow-hidden rounded-lg {event.isCompleted
		? 'bg-slate-400'
		: 'bg-slate-600'} p-1 text-sm text-slate-50 opacity-75 transition-all {highlight
		? 'p-0 shadow-2xl shadow-slate-700'
		: 'shadow-lg'}"
	style:grid-row="3"
	style:grid-column="{getColumnIndex(start) + 2} / {getColumnIndex(start) + 2}"
	style:top="{calculateTopOffset(start)}px"
	style:height="{calculateEventHeight(start, end)}px"
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
