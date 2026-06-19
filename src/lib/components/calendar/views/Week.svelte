<script lang="ts">
	import { onMount } from "svelte";
	import dayjs from "dayjs";

	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import {
		range,
		makeGetColumnIndex,
		roundToNearest15MinutesDayjs,
	} from "./geometry";
	import {
		DEFAULT_DAY_NUM,
		OFFSET_BY_HOUR,
		SIDE_WIDTH,
		SIZE,
		NOT_WORK_HOUR_RANGES,
	} from "./config";
	import { useNowIndicator } from "./useNowIndicator.svelte";
	import { useScrollRestore } from "./useScrollRestore.svelte";
	import { weekPanelScrollStates } from "./state.svelte";

	import DayHeader from "./DayHeader.svelte";
	import DayGrid from "./DayGrid.svelte";
	import DragPreview, { type DraggingTaskEvent } from "./DragPreview.svelte";
	import WeekEvent from "./WeekEvent.svelte";
	import type { Dayjs } from "dayjs";
	import type { Store } from "$lib/states/meta/store.svelte";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { list } from "radash";
	import { getInteractionContext } from "$lib/interaction/context.svelte";

	interface Props {
		dayNum?: number;
		store: Store;
	}

	let { dayNum = DEFAULT_DAY_NUM, store }: Props = $props();
	let offsetByHour = OFFSET_BY_HOUR;

	const { drag } = getInteractionContext();

	let today = dayjs().startOf("day").add(offsetByHour, "hour");
	let displayDayNum = 2 * dayNum + 1;
	let displayStartDay = today.subtract(dayNum, "day");
	let displayEndDay = today.add(dayNum, "day");
	let displayDays: Dayjs[] = range(-dayNum, dayNum).map((i) =>
		today.add(i, "day"),
	);

	const getColumnIndex = makeGetColumnIndex(displayStartDay);

	const events = $derived(
		store.queryEventsByRange(
			displayStartDay.valueOf(),
			displayEndDay.valueOf(),
		),
	);

	let dayHeight = $state(0);
	let containerWidth = $state(0);
	let draggingTaskEvent: DraggingTaskEvent | null = $state(null);

	const nowIndicator = useNowIndicator(offsetByHour);

	let snapsOffset = $derived.by(() => {
		const pieceNum = 24 * 4;
		const piece = dayHeight / pieceNum;
		return list(0, pieceNum, (i) => i * piece);
	});

	let scrollAreaRef = $state<HTMLElement>(null as any);

	onMount(() => {
		nowIndicator.start();
		const cleanupScroll = useScrollRestore(scrollAreaRef);
		return () => {
			nowIndicator.stop();
			cleanupScroll();
		};
	});

	function handleDragOver(day: Dayjs, _task: Task, topPx: number) {
		let start = day
			.startOf("day")
			.add(offsetByHour, "hour")
			.add((topPx / dayHeight) * 24 * 60 * 60 * 1000, "milliseconds");
		start = roundToNearest15MinutesDayjs(start);
		draggingTaskEvent = {
			start: start.valueOf(),
			end: start.valueOf() + 30 * 60 * 1000,
		};
	}

	function handleDrop(day: Dayjs, task: Task, topPx: number) {
		let start = day
			.startOf("day")
			.add(offsetByHour, "hour")
			.add((24 * 60 * 60 * 1000 * topPx) / dayHeight, "milliseconds");
		start = roundToNearest15MinutesDayjs(start);
		task.insertEvent(
			start.valueOf(),
			start.add(30, "minutes").valueOf(),
		);
		draggingTaskEvent = null;
	}

	function handleDragEnd() {
		draggingTaskEvent = null;
	}
</script>

<!-- 可滚动区域 -->
<ScrollArea
	bind:ref={scrollAreaRef}
	class=" h-full w-full rounded-lg"
	scrollbarYClasses="hidden"
	orientation="both"
>
	<!-- 内部大区域 -->
	<div
		data-tauri-drag-region
		class=" calendar relative grid rounded-lg"
		style:height="1800px"
		style:grid-template-columns="{SIDE_WIDTH}rem repeat({displayDayNum}, 1fr)"
		style:grid-template-rows="auto auto 1fr"
		style:width="{SIDE_WIDTH + SIZE * displayDayNum}rem"
	>
		<!-- 时间指示器红线 -->
		<div
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			style:grid-column="1 / -1"
			style:grid-row="3 / -1"
			class="relative"
		>
			<div
				style:z-index="10"
				style:top="{nowIndicator.currentTimePercentage}%"
				style:height="1px"
				class=" w-full absolute bg-red-400"
			></div>
			<div
				style:z-index="12"
				style:grid-column="3 / 3"
				style:top="{nowIndicator.currentTimePercentage}%"
				style:transform="translateY(-50%)"
				class="absolute text-xs text-red-400 font-light pl-6"
			>
				{dayjs().format("HH:mm")}
			</div>
		</div>

		<DayHeader
			{displayDays}
			{offsetByHour}
			scrollStates={weekPanelScrollStates}
		/>

		<DayGrid
			{displayDays}
			{offsetByHour}
			notWorkHourRange={NOT_WORK_HOUR_RANGES}
			{drag}
			bind:dayHeight
			bind:containerWidth
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onDragEnd={handleDragEnd}
		/>

		<!-- 事件 -->
		{#each events.filter((e) => e.task) as event (event.id)}
			<WeekEvent
				{offsetByHour}
				{event}
				{getColumnIndex}
				{dayHeight}
				dayWidth={Math.floor(containerWidth / displayDayNum)}
				task={event.task!}
				{snapsOffset}
			/>
		{/each}

		<DragPreview
			{draggingTaskEvent}
			{getColumnIndex}
			{offsetByHour}
			{dayHeight}
		/>
	</div>
</ScrollArea>
