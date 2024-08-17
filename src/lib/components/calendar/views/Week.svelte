<script lang="ts">
	import dayjs, { Dayjs } from 'dayjs';
	import { onDestroy, onMount } from 'svelte';
	import { percent, range } from './utils';
	import type { Database, Event } from '$lib/states/data';
	import { dayDropZone, dayExternalDropZone, interact } from './interact';
	import { TaskEventGroup } from '../data';
	import WeekEvent from './WeekEvent.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

	export let dayNum = 7;
	export let db: Database;
	export let rootId = 'root';
	let today = dayjs().startOf('day');

	// 以startDay为0
	let displayDayNum = 2 * dayNum + 1;
	let displayStartDay = today.subtract(dayNum, 'day');
	let displayDays = range(-dayNum, dayNum).map((i) => today.add(i, 'day'));

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

	let offsetWidth: number = 700;
	let size = offsetWidth / dayNum;

	let sideWidth = '4rem';

	let eventSubscriber = new TaskEventGroup(db, rootId, (updatedIds) => {
		eventIds = updatedIds;
	});
	onDestroy(() => {
		eventSubscriber.destory();
	});
	let eventIds = eventSubscriber.fetchAllEvents();

	let dayHeight: number;

	let draggingTaskEvent: Event | null = null;

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

	function isRestDay(day: Dayjs) {
		return (day.day() + 6) % 7 >= 5;
	}
</script>

<!-- 可滚动区域 -->
<ScrollArea class=" h-full w-full " orientation="both">
	<!-- <div class="  h-full overflow-scroll" bind:offsetWidth> -->
	<!-- 内部大区域 -->
	<div
		class=" calendar relative grid"
		style:height="2400px"
		style:grid-template-columns="{sideWidth} repeat({displayDayNum}, 1fr)"
		style:grid-template-rows="auto auto 1fr"
		style:width="{size * displayDayNum}px"
	>
		<!-- header -->
		<div
			style:display="grid"
			style:grid-column="2 / -1"
			style:grid-row="1 / 1"
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			class=" header-shadow sticky top-0 bg-background pb-1 pt-4 text-center text-slate-700"
			style:z-index="11"
		>
			{#each displayDays as day, i (day)}
				<div
					class=" flex flex-col items-center justify-end"
					style:grid-area="1 / {i + 1} / 1 / {i + 1}"
				>
					{#if day.isSame(dayjs().startOf('day'))}
						<Badge class=" px-1.5" variant="destructive">{day.format('ddd')}</Badge>
					{:else}
						<div class=" text-sm">{day.format('ddd')}</div>
					{/if}

					<div style:font-size="0.6rem" class=" text-xs font-extralight text-slate-400">
						{day.format('MM/DD')}
					</div>
				</div>
			{/each}
		</div>

		<!-- 左侧竖栏 -->
		<div
			style:display="grid"
			style:grid-column="1 / 1"
			style:grid-row="1 / -1"
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			class="sticky left-0 z-10 bg-background shadow-xl"
		>
			<!-- all-day -->
			<div
				class=" relative flex items-center justify-end text-xs font-extralight text-slate-500"
				style:grid-area="2 / 1 "
			>
				<div
					style:z-index="7"
					class=" absolute left-full top-0 h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
				/>
				all-day
				<div
					style:z-index="7"
					class=" absolute left-full top-full h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
				/>
			</div>

			<!-- 时钟格子 -->
			<div class=" flex flex-col font-extralight text-slate-400" style:grid-area="3 / 1 ">
				<!-- 上方下方各垫一个1单位高的格子, 然后中间23个2单位高的格子, 第i个格子的中间就是i+1AM/PM -->
				<div style:flex="1" />
				{#each range(1, 23) as hour}
					<div style:flex="2" class="relative flex items-center justify-end text-xs">
						<p class=" pr-1">{hour % 12} {hour > 12 ? 'PM' : 'AM'}</p>
						<!-- 横线 -->

						<div
							class=" absolute left-full top-1/2 h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
						/>
					</div>
				{/each}
				<div style:flex="1" />
			</div>
		</div>

		<!-- 日期格子 -->
		<div
			style:display="grid"
			style:grid-column="2 / -1"
			style:grid-row="3 / 3"
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			bind:offsetHeight={dayHeight}
		>
			{#each displayDays as day, i (day)}
				<div
					class="text-center {isRestDay(day) ? 'bg-slate-300 opacity-30' : ''}"
					style:grid-area="1 / {i + 1} / 1 / {i + 1}"
					use:dayDropZone={{}}
					use:dayExternalDropZone={{
						onDragEnd() {
							draggingTaskEvent = null;
						},
						onDragOver(taskId, topPx) {
							let start = day
								.startOf('day')
								.add((24 * 60 * 60 * 1000 * topPx) / dayHeight, 'milliseconds');
							start = roundToNearest15Minutes(start);
							draggingTaskEvent = {
								id: '',
								taskId: taskId,
								start: start.valueOf(),
								end: start.valueOf() + 30 * 60 * 1000,
								isAllDay: false,
								isCompleted: false
							};
						},
						onDrop(taskId, topPx) {
							let start = day
								.startOf('day')
								.add((24 * 60 * 60 * 1000 * topPx) / dayHeight, 'milliseconds');
							start = roundToNearest15Minutes(start);
							draggingTaskEvent = {
								id: db.genID(),
								taskId: taskId,
								start: start.valueOf(),
								end: start.valueOf() + 30 * 60 * 1000,
								isAllDay: false,
								isCompleted: false
							};
							db.createEvent(draggingTaskEvent, 'dragging');
							draggingTaskEvent = null;
						}
					}}
					data-dayts={day.valueOf()}
				></div>
			{/each}
		</div>

		<!-- 事件 -->
		{#each eventIds as eventId (eventId)}
			<WeekEvent {db} {eventId} {displayStartDay} {dayHeight} />
		{/each}

		{#if draggingTaskEvent}
			<div
				style:pointer-events="none"
				style:z-index="8"
				class=" relative bg-blue-300"
				style:grid-row="3"
				style:grid-column={getDisplayDayNum(draggingTaskEvent.start) + 2}
				style:top="{calculateTopOffset(draggingTaskEvent, dayHeight)}px"
				style:height="{calculateEventHeight(draggingTaskEvent, dayHeight)}px"
			>
				{dayjs(draggingTaskEvent.start).format('HH:mm')}-{dayjs(draggingTaskEvent.end).format(
					'HH:mm'
				)}
			</div>
		{/if}
	</div>
	<!-- </div> -->
</ScrollArea>

<style>
	.header-shadow::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 20px;
		z-index: 7;
		background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.05), transparent);
		transform: translateY(100%);
		pointer-events: none;
	}
</style>
