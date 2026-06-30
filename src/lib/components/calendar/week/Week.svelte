<script lang="ts">
	/**
	 * 周视图主组件（薄视图）
	 *
	 * 创建 WeekController 并通过 $effect 驱动生命周期，
	 * 模板中直接读取 controller 的状态渲染子组件。
	 */
	import dayjs from "dayjs";

	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { getInteractionContext } from "$lib/interaction/context.svelte";

	import { NOT_WORK_HOUR_RANGES } from "../shared/config";
	import { DAY_HEIGHT_PX, SIDE_WIDTH, SIZE } from "./week-config";
	import { WeekController } from "./WeekController.svelte";

	import DayHeader from "./DayHeader.svelte";
	import DayGrid from "./DayGrid.svelte";
	import DragPreview from "./DragPreview.svelte";
	import WeekEvent from "./WeekEvent.svelte";
	import type { Store } from "$lib/states/meta/store.svelte";

	interface Props {
		store: Store;
		dayNum?: number;
	}

	let { store, dayNum }: Props = $props();

	const controller = new WeekController(store, dayNum);
	const { drag } = getInteractionContext();

	$effect(() => {
		controller.onReady();
		return () => controller.destroy();
	});
</script>

<ScrollArea
	bind:ref={controller.scrollAreaRef}
	class=" h-full w-full rounded-lg"
	scrollbarYClasses="hidden"
	orientation="both"
>
	<!--
		日历主网格容器
		CSS Grid 布局：
		  列: [左侧时间轴 SIDE_WIDTH rem] [日列 × displayDayNum, 每列 1fr]
		  行: [auto 表头] [auto 全天标签] [1fr 时间网格]
		固定高度 DAY_HEIGHT_PX(1800px)，宽度 = SIDE_WIDTH + SIZE × displayDayNum
	-->
	<div
		data-tauri-drag-region
		class=" calendar relative grid rounded-lg"
		style:height="{DAY_HEIGHT_PX}px"
		style:grid-template-columns="{SIDE_WIDTH}rem repeat({controller
			.displayRange.displayDayNum}, 1fr)"
		style:grid-template-rows="auto auto 1fr"
		style:width="{SIDE_WIDTH +
			SIZE * controller.displayRange.displayDayNum}rem"
	>
		<!--
			当前时间指示线层
			跨全部列（grid-column: 1 / -1），占据时间网格行（grid-row: 3 / -1）
			使用 subgrid 与父网格对齐，红线和时间标签按 nowPercentage 定位
		-->
		<div
			style:grid-template-columns="subgrid"
			style:grid-template-rows="subgrid"
			style:grid-column="1 / -1"
			style:grid-row="3 / -1"
			class="relative"
		>
			<!-- 红色横线：贯穿全宽 -->
			<div
				style:z-index="10"
				style:top="{controller.nowPercentage}%"
				style:height="1px"
				class=" w-full absolute bg-red-400"
			></div>
			<!-- 时间标签：显示当前 HH:mm -->
			<div
				style:z-index="12"
				style:grid-column="3 / 3"
				style:top="{controller.nowPercentage}%"
				style:transform="translateY(-50%)"
				class="absolute text-xs text-red-400 font-light pl-6"
			>
				{dayjs().format("HH:mm")}
			</div>
		</div>

		<!-- 日期表头：星期 + 日期，高亮今天（grid-row: 1） -->
		<DayHeader
			displayDays={controller.displayRange.displayDays}
			offsetByHour={controller.offsetByHour}
		/>

		<!--
			时间网格：小时刻度 + 非工作时段背景 + 拖放区域（grid-row: 3）
			通过 bind 回传 dayHeight 和 containerWidth 给 controller
		-->
		<DayGrid
			displayDays={controller.displayRange.displayDays}
			offsetByHour={controller.offsetByHour}
			notWorkHourRange={NOT_WORK_HOUR_RANGES}
			{drag}
			bind:dayHeight={controller.dayHeight}
			bind:containerWidth={controller.containerWidth}
			onDragOver={controller.handleDragOver.bind(controller)}
			onDrop={controller.handleDrop.bind(controller)}
			onDragEnd={controller.handleDragEnd.bind(controller)}
		/>

		<!-- 事件块：每个 PositionedSegment 渲染一个 WeekEvent，跨天事件会有多个 -->
		{#each controller.positionedSegments as seg (seg.eventId + "-" + seg.dayIndex)}
			<WeekEvent
				offsetByHour={controller.offsetByHour}
				segment={seg}
				task={seg.event.task!}
				dayHeight={controller.dayHeight}
				dayWidth={controller.dayWidth}
				getColumnIndex={controller.getColumnIndex}
				snapsOffset={controller.snapsOffset}
			/>
		{/each}

		<!-- 从 Todo 拖入时的预览块（仅 draggingTaskEvent 非空时显示） -->
		<DragPreview
			draggingTaskEvent={controller.draggingTaskEvent}
			getColumnIndex={controller.getColumnIndex}
			offsetByHour={controller.offsetByHour}
			dayHeight={controller.dayHeight}
		/>
	</div>
</ScrollArea>
