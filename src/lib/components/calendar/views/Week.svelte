<script lang="ts">
	import dayjs from 'dayjs';
	import { onDestroy, onMount } from 'svelte';
	import { range } from './utils';
	import type { Database, Event } from '$lib/states/data';
	import interact from 'interactjs';
	import { resize } from './resize';
	import EventDropable from './dnd/EventDropable.svelte';
	import { TaskEventGroup } from '../data';
	import WeekEvent from './WeekEvent.svelte';

	export let dayNum = 7;
	export let db: Database;
	export let rootId = 'root';
	let today = dayjs().startOf('day');

	// 以startDay为0
	let displayDayNum = 2 * dayNum + 1;
	let displayStartDay = today.subtract(dayNum, 'day');
	let displayDays = range(-dayNum, dayNum).map((i) => today.add(i, 'day'));

	let offsetWidth: number = 700;
	let size = offsetWidth / dayNum;

	let headerHeight = '4rem';
	let sideWidth = '4rem';

	let eventSubscriber = new TaskEventGroup(db, rootId, (updatedIds) => {
		eventIds = updatedIds;
	});
	onDestroy(() => {
		eventSubscriber.destory();
	});
	let eventIds = eventSubscriber.fetchAllEvents();

	function timeToRowNum(t: number) {
		const time = dayjs(t);
		return time.hour() * 60 + time.minute() + 2;
	}
	function timeToColNum(t: number) {
		const time = dayjs(t);
		return time.diff(displayStartDay, 'day') + 2;
	}

	function CellToTime(t: number) {
		const time = dayjs(t);
		return time.hour() * 60 + time.minute() + 2;
	}
</script>

<!-- 可滚动区域 -->
<div class="  h-full overflow-scroll" bind:offsetWidth>
	<!-- 内部大区域 -->
	<div
		class=" calendar relative grid"
		style:height="2400px"
		style:grid-template-columns="{sideWidth} repeat({displayDayNum}, 1fr)"
		style:grid-template-rows="{headerHeight} repeat(1440, 1fr)"
		style:width="{size * displayDayNum}px"
	>
		<!-- 左侧竖栏 -->
		{#each range(1, 24) as i (i)}
			<div
				class=" sticky left-0 flex items-end justify-end border-b border-slate-300 bg-white pr-2 text-slate-500"
				style:grid-area="{(i - 1) * 60 + 2} / 1 / span 60 / 1"
			>
				{i}:00
			</div>
		{/each}

		<!-- 每列背景板 -->
		{#each displayDays as day, i (day)}
			<!-- header -->
			<div
				class=" sticky top-0 flex flex-row justify-center bg-slate-200 text-center"
				style:grid-area="1 / {i + 2} / 1 / {i + 2}"
				style:z-index="11"
			>
				{day.format('MM/DD')}<br />
				{day.day()}
			</div>

			{#each range(0, 23) as hour}
				{#each range(0, 59, 15) as minute}
					<div
						class="cell"
						class:border-t-2={minute == 0}
						class:border-t={minute == 30}
						style:grid-area="{2 + hour * 60 + minute} / {i + 2} / 15 span / {i + 2}"
					>
						<EventDropable
							start={day.hour(hour).minute(minute).valueOf()}
							end={day
								.hour(hour)
								.minute(minute + 15)
								.valueOf()}
							depth={1}
						/>
					</div>
				{/each}
			{/each}
		{/each}

		<!-- 事件 -->
		{#each eventIds as eventId (eventId)}
			<WeekEvent {db} {eventId} {timeToColNum} {timeToRowNum} />
		{/each}
	</div>
</div>

<style>
</style>
