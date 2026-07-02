<script lang="ts">
	/**
	 * 周视图主组件（薄视图）
	 *
	 * 创建 WeekSkeleton（坐标系）和 WeekController（业务逻辑），
	 * 通过 $effect 驱动生命周期，模板中直接读取状态渲染子组件。
	 */
	import dayjs from "dayjs";

	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { getInteractionContext } from "$lib/interaction/context.svelte";

	import { NOT_WORK_HOUR_RANGES } from "./layout/config";
	import { WeekSkeleton } from "./WeekSkeleton.svelte";
	import { WeekController } from "./WeekController.svelte";

	import DayHeader from "./DayHeader.svelte";
	import DayGrid from "./DayGrid.svelte";
	import DragPreview from "./DragPreview.svelte";
	import WeekEvent from "./event/WeekEvent.svelte";
	import type { Store } from "$lib/states/meta/store.svelte";

	interface Props {
		store: Store;
		dayNum?: number;
	}

	let { store, dayNum }: Props = $props();

	const skeleton = new WeekSkeleton(dayNum);
	const controller = new WeekController(store, skeleton);
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
	<div data-tauri-drag-region use:skeleton.root class="relative rounded-lg">
		<!--
			当前时间指示线层
			由 skeleton.nowIndicator 定位到 grid-row 3, cols 1/-1, subgrid。
			红线和时间标签按 nowPercentage 定位。
		-->
		<div use:skeleton.nowIndicator class="relative">
			<!-- 红色横线：贯穿全宽 -->
			<div
				style:z-index={WeekSkeleton.layers.nowIndicator}
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

		<!-- 日期表头：由 skeleton.header 定位 -->
		<DayHeader {skeleton} />

		<!--
			时间网格：小时刻度 + 非工作时段背景 + 拖放区域
			由 skeleton 的 timeAxis / timeGridArea / timeGrid + measure 定位
		-->
		<DayGrid
			{skeleton}
			notWorkHourRange={NOT_WORK_HOUR_RANGES}
			{drag}
			onDragOver={controller.handleDragOver.bind(controller)}
			onDrop={controller.handleDrop.bind(controller)}
			onDragEnd={controller.handleDragEnd.bind(controller)}
		/>

		<!-- 事件块：每个 PositionedSegment 渲染一个 WeekEvent，跨天事件会有多个 -->
		{#each controller.positionedSegments as seg (seg.eventId + "-" + seg.dayIndex)}
			<WeekEvent
				{skeleton}
				segment={seg}
				task={seg.event.task!}
				snapsOffset={controller.snapsOffset}
			/>
		{/each}

		<!-- 从 Todo 拖入时的预览块（仅 draggingTaskEvent 非空时显示） -->
		<DragPreview
			{skeleton}
			draggingTaskEvent={controller.draggingTaskEvent}
		/>
	</div>
</ScrollArea>
