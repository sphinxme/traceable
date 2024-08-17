<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import dayjs, { type Dayjs } from 'dayjs';

	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';

	import type { Database, Event } from '$lib/states/data';
	import { highlightFEventIds } from '$lib/states/stores';

	import { interact } from './interact';
	import { percent } from './utils';

	export let eventId: string;
	export let db: Database;
	export let displayStartDay: Dayjs;
	export let dayHeight: number;

	let event = db.getEventData(eventId);
	let completed = event.isCompleted;
	const unobserve = db.observeEvent(eventId, (dbEvent) => {
		event = dbEvent;
		completed = event.isCompleted;
	});

	let yText = db.getTaskText(event.taskId);
	let text = yText.toJSON();
	const updateText = () => {
		text = yText.toJSON();
	};
	yText.observe(updateText);
	onDestroy(() => {
		unobserve();
		yText.unobserve(updateText);
	});

	const getDisplayDayNum = (t: number) => {
		return dayjs(t).diff(displayStartDay, 'day');
	};
	const calculateTopOffset = (event: Event, dayHeight: number) => {
		const start = dayjs(event.start).startOf('day');
		const end = dayjs(event.start);
		return Math.floor(percent(start, end) * dayHeight);
	};
	const calculateEventHeight = (event: Event, dayHeight: number) => {
		const start = dayjs(event.start);
		const end = dayjs(event.end);
		return Math.floor(percent(start, end) * dayHeight);
	};

	let highlight = highlightFEventIds.has(eventId);
	onMount(() => {
		const unsubscribe = highlightFEventIds.subscribe((set) => {
			highlight = set.has(eventId);
		});
		return async () => {
			unsubscribe();
		};
	});

	/**
	 * 将给定的时间四舍五入到最近的15分钟倍数。
	 * @param {dayjs.Dayjs} time - 需要进行四舍五入的时间。
	 * @returns {dayjs.Dayjs} 四舍五入后的时间。
	 */
	function roundToNearest15Minutes(time: Dayjs) {
		// 获取当前分钟数
		const minutes = time.minute();

		// 计算距离最近的15分钟倍数的分钟数
		const remainder = minutes % 15;
		let roundedMinutes = minutes;

		// 如果剩余分钟数小于7.5分钟，则向下取整到最近的15分钟倍数
		// 如果剩余分钟数大于等于7.5分钟，则向上取整到最近的15分钟倍数
		if (remainder < 7.5) {
			roundedMinutes -= remainder;
		} else {
			roundedMinutes += 15 - remainder;
		}

		// 返回四舍五入后的时间
		return time.minute(roundedMinutes).second(0).millisecond(0);
	}

	const onDeleteMyself = () => {
		db.deleteEvent(eventId);
	};
</script>

<div
	use:interact={{
		onDropMove(day, topPx) {
			let start = day.add(24 * 60 * 60 * 1000 * (topPx / dayHeight), 'milliseconds');
			// 吸附
			start = roundToNearest15Minutes(start);

			const duration = event.end - event.start;
			event.start = start.valueOf();
			event.end = event.start + duration;
		},
		onDropEnd() {
			db.updateEvent(eventId, event, 'dropping');
		},
		onResizeMove(heightPx) {
			const duration = (24 * 60 * 60 * 1000 * heightPx) / dayHeight;
			const end = event.start + duration;
			event.end = roundToNearest15Minutes(dayjs(end)).valueOf();
		},
		onResizeEnd() {
			db.updateEvent(eventId, event, 'dropping');
		}
	}}
	style:z-index="8"
	class="absolute w-full grow-0 overflow-hidden rounded-lg {completed
		? 'bg-slate-400'
		: 'bg-slate-600'} p-1 text-sm text-slate-50 transition-all {highlight
		? 'p-0 shadow-2xl shadow-slate-700'
		: 'shadow-lg'}"
	style:grid-row="3"
	style:grid-column="{getDisplayDayNum(event.start) + 2} / {getDisplayDayNum(event.start) + 2}"
	style:top="{calculateTopOffset(event, dayHeight)}px"
	style:height="{calculateEventHeight(event, dayHeight)}px"
>
	<Tooltip.Root openDelay={0} closeDelay={100}>
		<Tooltip.Trigger class="h-full w-full">
			<ContextMenu.Root>
				<ContextMenu.Trigger class="flex h-full w-full flex-col">
					<div class=" text-xs font-extralight">
						{dayjs(event.start).format('HH:mm')}-{dayjs(event.end).format('HH:mm')}
					</div>
					<div class="line-clamp-3 text-wrap">{text}</div>
				</ContextMenu.Trigger>
				<ContextMenu.Content>
					<ContextMenu.Item on:click={onDeleteMyself}>删除</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p class=" text-wrap">{text}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</div>
