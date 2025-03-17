<script lang="ts">
	import { onMount } from "svelte";
	import dayjs from "dayjs";

	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import {
		percent,
		range,
		isRestDay,
		roundToNearest15Minutes,
	} from "./utils.svelte";
	import { dayDropZone, dayExternalDropZone } from "./interact.svelte";

	import WeekEvent from "./WeekEvent.svelte";
	import Focusable from "$lib/components/ui/focusable/Focusable.svelte";
	import { EventProxyManager } from "$lib/states/meta/event.svelte";
	import { list } from "radash";

	interface Props {
		dayNum?: number;
		manager: EventProxyManager;
	}

	let { dayNum = 10, manager }: Props = $props();
	let offsetByHour = 6; // 每天从几点开始(当前每天从6点开始)
	const notWorkHourRange = [
		{ start: 6, end: 10 },
		{ start: 12, end: 13.5 },
		{ start: 18, end: 19.5 },
		{ start: 22, end: 30 },
	];
	let today = dayjs().startOf("day").add(6, "hour");

	// 以startDay为0
	let displayDayNum = 2 * dayNum + 1;
	let displayStartDay = today.subtract(dayNum, "day");
	let displayEndDay = today.add(dayNum, "day");
	let displayDays = range(-dayNum, dayNum).map((i) => today.add(i, "day"));

	/**
	 * 判断t所在的天数是对应了当前的第几列
	 * @param t 时间的毫秒时间戳
	 */
	const getColumnIndex = (t: number) => {
		return dayjs(t).diff(displayStartDay, "day");
	};
	const calculateTopOffset = (start: number): number => {
		const startOfDay = dayjs(start)
			.startOf("day")
			.add(offsetByHour, "hour");
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

	const events = manager.queryByRange$(
		displayStartDay.valueOf(),
		displayEndDay.valueOf(),
	);

	let dayHeight = $state(0); // binding
	let containerWidth = $state(0); // binding
	let draggingTaskEvent: any = $state(null);

	let currentTimePercentage = $state(0);
	let animationFrameId = 0;
	const totalMilliseconds = 24 * 60 * 60 * 1000; // 一天总毫秒数
	const updateTimePosition = () => {
		const now = dayjs();
		const startOfDay = now.startOf("day").add(offsetByHour, "hour");
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

	// 每个15分钟日期格子的offset值 单位px, 用于吸附
	let snapsOffset = $derived.by(() => {
		// 15分钟一块, 每小时4等分, 就是 24 * 4
		const pieceNum = 24 * 4;
		const piece = dayHeight / pieceNum;
		return list(0, pieceNum, (i) => i * piece);
	});
</script>

<!-- 可滚动区域 -->
<ScrollArea
	class=" h-full w-full "
	scrollbarYClasses="hidden"
	orientation="both"
>
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
			class=" header-shadow sticky top-0 bg-background pb-4 pt-0 text-center text-zinc-700"
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
						class:font-light={!day.isSame(
							dayjs().add(-offsetByHour, "hour"),
							"day",
						)}
						class:text-red-500={day.isSame(
							dayjs().add(-offsetByHour, "hour"),
							"day",
						)}
					>
						{day.format("ddd")}
					</div>
					<Focusable
						focus={day.isSame(
							dayjs().add(-offsetByHour, "hour"),
							"day",
						)}
						inline="center"
						block="start"
					/>

					<div
						style:font-size="0.7rem"
						class="text-xs font-extralight text-zinc-400"
					>
						{day.format("MM-DD")}
					</div>
				</div>
			{/each}
		</div>

		<div
			data-tauri-drag-region
			style:display="grid"
			style:grid-column="1 / 1"
			style:grid-row="1 / -1"
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			class="sticky left-0"
		>
			<!-- 时钟格子 -->
			<div class=" flex flex-col" style:grid-area="3 / 1 ">
				<!-- 上方下方各垫一个1单位高的格子, 然后中间23个2单位高的格子, 第i个格子的中间就是i+offsetAM/PM -->
				<div style:flex="1"></div>
				{#each range(1, 23)}
					<div
						style:flex="2"
						class="relative flex items-center justify-end text-xs"
					>
						<div
							style:z-index="1"
							class=" absolute left-full top-1/2 h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
						></div>
					</div>
				{/each}
				<div style:flex="1"></div>
			</div>
		</div>

		<!-- 左侧竖栏 -->
		<div
			data-tauri-drag-region
			style:display="grid"
			style:grid-column="1 / 1"
			style:grid-row="1 / -1"
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			class="sticky z-10 left-0 bg-background shadow-xl"
		>
			<!-- all-day -->
			<div
				class="z-10 relative flex items-center justify-end text-xs font-extralight text-zinc-500"
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
				class=" z-10 flex flex-col font-extralight text-zinc-400"
				style:grid-area="3 / 1 "
			>
				<!-- 上方下方各垫一个1单位高的格子, 然后中间23个2单位高的格子, 第i个格子的中间就是i+offsetAM/PM -->
				<div style:flex="1"></div>
				{#each range(1 + offsetByHour, 23 + offsetByHour) as hour}
					<div
						style:flex="2"
						class="relative flex items-center justify-end text-xs"
					>
						<p class=" pr-2">
							{hour % 12 ? hour % 12 : hour > 12 ? 12 : 0}
							{hour > 12 && hour < 24 ? "PM" : "AM"}
						</p>
						<!-- 横线 -->

						<!-- <div
							style:z-index="1"
							class=" absolute left-full top-1/2 h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
						></div> -->
					</div>
				{/each}
				<div style:flex="1"></div>
			</div>
		</div>

		<!-- 不可工作区域 -->
		<!--  /* 定义48行，每行高度相等 */ -->
		<div
			style:grid-column="2 / -1"
			style:grid-row="3 / 3"
			class=" grid"
			style:grid-template-rows="repeat(48, 1fr)"
		>
			{#each notWorkHourRange as range}
				<div
					style:grid-row="{(range.start - offsetByHour) * 2 + 1} / {(range.end -
						offsetByHour) *
						2 +
						1}"
					class="relative flex items-center justify-end text-xs bg-zinc-100"
				></div>
			{/each}
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
			bind:offsetWidth={containerWidth}
		>
			{#each displayDays as day, i (day)}
				<div
					class="text-center {isRestDay(day)
						? 'bg-zinc-300 opacity-30'
						: ''}"
					style:grid-area="1 / {i + 1} / 1 / {i + 1}"
					use:dayDropZone
					use:dayExternalDropZone={{
						onDragEnd() {
							draggingTaskEvent = null;
						},
						onDragOver(task, topPx) {
							let start = day
								.startOf("day")
								.add(offsetByHour, "hour")
								.add(
									(topPx / dayHeight) * 24 * 60 * 60 * 1000,
									"milliseconds",
								);
							start = roundToNearest15Minutes(start);
							draggingTaskEvent = {
								start: start.valueOf(),
								end: start.valueOf() + 30 * 60 * 1000,
							};
						},
						onDrop(task, topPx) {
							let start = day
								.startOf("day")
								.add(offsetByHour, "hour")
								.add(
									(24 * 60 * 60 * 1000 * topPx) / dayHeight,
									"milliseconds",
								);
							start = roundToNearest15Minutes(start);
							task.insertEvent(
								start.valueOf(),
								start.add(30, "minutes").valueOf(),
							);
							draggingTaskEvent = null;
						},
					}}
					data-dayts={day.valueOf()}
				></div>
			{/each}
		</div>

		<!-- 事件 -->

		{#each $events as event (event.id)}
			<WeekEvent
				{offsetByHour}
				{event}
				{getColumnIndex}
				{dayHeight}
				dayWidth={Math.floor(containerWidth / displayDayNum)}
				task={event.task}
				{snapsOffset}
			/>
		{/each}

		{#if draggingTaskEvent}
			<div
				style:pointer-events="none"
				style:z-index="8"
				class=" relative bg-slate-300"
				style:grid-row="3"
				style:grid-column={getColumnIndex(draggingTaskEvent.start) + 2}
				style:top="{calculateTopOffset(draggingTaskEvent.start)}px"
				style:height="{calculateEventHeight(
					draggingTaskEvent.start,
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
