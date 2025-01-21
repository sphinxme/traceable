<script lang="ts">
	import { getContext, onDestroy, onMount } from "svelte";
	import dayjs, { Dayjs } from "dayjs";

	import { Badge } from "$lib/components/ui/badge";
	import { ScrollArea } from "$lib/components/ui/scroll-area";

	import {
		Database,
		id,
		type EventProxy,
		type TaskProxy,
	} from "$lib/states/rxdb";
	import {
		percent,
		range,
		isRestDay,
		roundToNearest15Minutes,
	} from "./utils.svelte";
	import { dayDropZone, dayExternalDropZone } from "./interact.svelte";

	import WeekEvent from "./WeekEvent.svelte";
	import { firstValueFrom } from "rxjs";
	import { filterNullish } from "$lib/states/rxdb/utils.svelte";
	import Focusable from "$lib/components/ui/focusable/Focusable.svelte";

	let { dayNum = 10 } = $props();
	const db = getContext<Database>("db");
	let today = dayjs().startOf("day");

	// 以startDay为0
	let displayDayNum = 2 * dayNum + 1;
	let displayStartDay = today.subtract(dayNum, "day");
	let displayDays = range(-dayNum, dayNum).map((i) => today.add(i, "day"));

	/**
	 * 判断t所在的天数是对应了当前的第几列
	 * @param t 时间的毫秒时间戳
	 */
	const getColumnIndex = (t: number) => {
		return dayjs(t).diff(displayStartDay, "day");
	};
	const calculateTopOffset = (start: number): number => {
		const startOfDay = dayjs(start).startOf("day");
		return Math.floor(percent(startOfDay.valueOf(), start) * dayHeight);
	};
	const calculateEventHeight = (start: number, end: number): number => {
		return Math.floor(percent(start, end) * dayHeight);
	};

	/**
	 * 没有offset
	 */
	// let offsetWidth: number = 700; // TODO:offsetWidth改成监听滚动区域 保持7天日期+侧边栏的宽度和滚动视口齐平
	let size = 7; // 7rem
	let sideWidth = 4;

	// TODO: 支持筛选event
	// let eventSubscriber = new TaskEventGroup(db, rootId, (updatedIds) => {
	// 	eventIds = updatedIds;
	// });
	// onDestroy(() => {
	// 	eventSubscriber.destory();
	// });
	// let eventIds = eventSubscriber.fetchAllEvents();
	const events = db.events
		.find()
		.where({
			start: {
				$gt: displayStartDay.valueOf(),
			},
			// end: {
			// 	"$lt": displayEndDay.valueOf()
			// }
		})
		.$.pipe(filterNullish());
	const loadingEvents = firstValueFrom(events);

	const eventTaskCache = new Map<string, Promise<TaskProxy>>();
	const getEventTask = (event: EventProxy) => {
		const taskId = event.task;
		if (!eventTaskCache.get(taskId)) {
			eventTaskCache.set(taskId, event.populate("task"));
		}
		return eventTaskCache.get(taskId)!;
	};

	let dayHeight = $state(0); // binding
	let draggingTaskEvent: any = $state(null);

	let currentTimePercentage = $state(0);
	let animationFrameId = 0;
	const totalMilliseconds = 24 * 60 * 60 * 1000; // 一天总毫秒数
	const updateTimePosition = () => {
		const now = dayjs();
		const startOfDay = now.startOf("day");
		const currentMilliseconds = now.diff(startOfDay);
		currentTimePercentage = (currentMilliseconds / totalMilliseconds) * 100;
	};
	const animate = () => {
		updateTimePosition();
		setTimeout(() => {
			animationFrameId = requestAnimationFrame(animate);
		}, 10000);
	};

	onMount(() => {
		animate(); // 启动动画循环
		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	});
</script>

<!-- 可滚动区域 -->
<ScrollArea class=" h-full w-full " orientation="both">
	<!-- 内部大区域 -->
	<div
		data-tauri-drag-region
		class=" calendar relative grid"
		style:height="1800px"
		style:grid-template-columns="{sideWidth}rem repeat({displayDayNum}, 1fr)"
		style:grid-template-rows="auto auto 1fr"
		style:width="{sideWidth + size * displayDayNum}rem"
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
				style:top="{currentTimePercentage}%"
				style:height="1px"
				class=" w-full absolute bg-red-400"
			></div>
			<div
				style:z-index="12"
				style:grid-column="3 / 3"
				style:top="{currentTimePercentage}%"
				style:transform="translateY(-50%)"
				class="absolute text-xs text-red-400 font-light pl-6"
			>
				{dayjs().format("HH:mm")}
			</div>
		</div>
		<!-- header -->
		<div
			data-tauri-drag-region
			style:display="grid"
			style:grid-column="2 / -1"
			style:grid-row="1 / 1"
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			class=" header-shadow sticky top-0 bg-background pb-4 pt-0 text-center text-slate-700"
			style:z-index="11"
		>
			{#each displayDays as day, i (day)}
				<div
					data-tauri-drag-region
					class=" flex flex-col items-center justify-between"
					style:grid-area="1 / {i + 1} / 1 / {i + 1}"
				>
					<div
						class="text-base font-light"
						class:font-light={!day.isSame(dayjs(), "day")}
						class:text-red-500={day.isSame(dayjs(), "day")}
					>
						{day.format("ddd")}
					</div>
					<Focusable
						focus={day.isSame(dayjs(), "day")}
						inline="center"
						block="start"
					/>

					<div
						style:font-size="0.7rem"
						class="text-xs font-extralight text-slate-400"
					>
						{day.format("MM-DD")}
					</div>
				</div>
			{/each}
		</div>

		<!-- 左侧竖栏 -->
		<div
			data-tauri-drag-region
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
				></div>
				<p class=" pr-2">全天</p>
				<div
					style:z-index="7"
					class=" absolute left-full top-full h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
				></div>
			</div>

			<!-- 时钟格子 -->
			<div
				class=" flex flex-col font-extralight text-slate-400"
				style:grid-area="3 / 1 "
			>
				<!-- 上方下方各垫一个1单位高的格子, 然后中间23个2单位高的格子, 第i个格子的中间就是i+1AM/PM -->
				<div style:flex="1"></div>
				{#each range(1, 23) as hour}
					<div
						style:flex="2"
						class="relative flex items-center justify-end text-xs"
					>
						<p class=" pr-2">
							{hour % 12 ? hour % 12 : hour > 12 ? 12 : 0}
							{hour > 12 ? "PM" : "AM"}
						</p>
						<!-- 横线 -->

						<div
							class=" absolute left-full top-1/2 h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
						></div>
					</div>
				{/each}
				<div style:flex="1"></div>
			</div>
		</div>

		<!-- 日期格子 -->
		<div
			style:z-index="7"
			style:display="grid"
			style:grid-column="2 / -1"
			style:grid-row="3 / 3"
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			bind:offsetHeight={dayHeight}
		>
			{#each displayDays as day, i (day)}
				<div
					class="text-center {isRestDay(day)
						? 'bg-slate-300 opacity-30'
						: ''}"
					style:grid-area="1 / {i + 1} / 1 / {i + 1}"
					use:dayDropZone
					use:dayExternalDropZone={{
						onDragEnd() {
							draggingTaskEvent = null;
						},
						onDragOver(taskId, topPx) {
							let start = day
								.startOf("day")
								.add(
									(topPx / dayHeight) * 24 * 60 * 60 * 1000,
									"milliseconds",
								);
							start = roundToNearest15Minutes(start);
							draggingTaskEvent = {
								id: "",
								taskId: taskId,
								start: start.valueOf(),
								end: start.valueOf() + 30 * 60 * 1000,
								isAllDay: false,
								isCompleted: false,
							};
						},
						onDrop(taskId, topPx) {
							let start = day
								.startOf("day")
								.add(
									(24 * 60 * 60 * 1000 * topPx) / dayHeight,
									"milliseconds",
								);
							start = roundToNearest15Minutes(start);
							const eventId = id();

							db.events.insert({
								id: eventId,
								start: start.valueOf(),
								end: start.add(30, "minutes").valueOf(),
								isAllDay: false,
								task: taskId,
							});

							draggingTaskEvent = null;
						},
					}}
					data-dayts={day.valueOf()}
				></div>
			{/each}
		</div>

		<!-- 事件 -->
		{#await loadingEvents then}
			{#each $events as event (event.id)}
				{#await getEventTask(event) then task}
					<WeekEvent
						event={event.$}
						{getColumnIndex}
						{dayHeight}
						task={task.$}
					/>
				{/await}
			{/each}
		{/await}

		{#if draggingTaskEvent}
			<div
				style:pointer-events="none"
				style:z-index="8"
				class=" relative bg-blue-300"
				style:grid-row="3"
				style:grid-column={getColumnIndex(draggingTaskEvent.start) + 2}
				style:top="{calculateTopOffset(draggingTaskEvent.start)}px"
				style:height="{calculateEventHeight(
					draggingTaskEvent,
					dayHeight,
				)}px"
			>
				{dayjs(draggingTaskEvent.start).format("HH:mm")}-{dayjs(
					draggingTaskEvent.end,
				).format("HH:mm")}
			</div>
		{/if}
	</div>
</ScrollArea>

<style>
	.header-shadow::after {
		content: "";
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 20px;
		z-index: 7;
		background-image: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.05),
			transparent
		);
		transform: translateY(100%);
		pointer-events: none;
	}
</style>
