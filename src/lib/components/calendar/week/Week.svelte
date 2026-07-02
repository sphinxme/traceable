<script lang="ts">
	/**
	 * 周视图主组件（薄视图）
	 *
	 * 创建 WeekSkeletonController（坐标系）和 WeekController（业务逻辑），
	 * 通过 $effect 驱动生命周期，模板中直接读取状态渲染子组件。
	 *
	 * ## Skeleton-Controller-Svelte 三层架构
	 *
	 * 周视图采用三层架构：
	 * - **Skeleton** 管坐标（"在哪里"）— WeekSkeletonController，网格定义 + 定位 Actions
	 * - **Controller** 管业务（"是什么"）— WeekController，事件查询 + 布局 + 交互状态
	 * - **Svelte** 管渲染（"长什么样"）— 本组件及子组件，纯展示
	 *
	 * ### 分层原则
	 *
	 * | 层 | 目录 | 职责 | 可测试性 |
	 * |----|------|------|----------|
	 * | 纯逻辑 | `segment_layout/` | 几何计算、布局引擎，零 Svelte/DOM 依赖 | 纯函数直接测试 |
	 * | 骨架 | `WeekSkeletonController.svelte.ts` | 网格定义、实测尺寸、定位 Actions | 实例化后断言状态 |
	 * | 控制器 | `WeekController.svelte.ts`、`event/EventSegmentController.svelte.ts` | 业务逻辑 + 交互状态 + interactjs 绑定，委托 skeleton 管理坐标 | 实例化后断言状态/调用方法 |
	 * | Svelte Action | `dropZone.svelte.ts` | DOM 适配器（interactjs 拖放区），委托控制器 | 需 DOM 环境 |
	 * | 视图 | `*.svelte` | 纯展示，通过 `use:skeleton.xxx` 定位，读控制器状态渲染 | Svelte 组件测试 |
	 *
	 * ### 视图与控制器的连接
	 *
	 * 本组件在 `<script>` 顶部创建 skeleton 和 controller，
	 * 通过 `$effect` 驱动生命周期：
	 * ```svelte
	 * const skeleton = new WeekSkeletonController(dayNum);
	 * const controller = new WeekController(store, skeleton);
	 * $effect(() => { controller.onReady(); return () => controller.destroy(); });
	 * ```
	 * 模板中根容器由 WeekSkeleton 组件（外壳）承载 `skeleton.root`，
	 * 各子组件通过 `use:skeleton.xxx` 声明语义角色。
	 */
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { getInteractionContext } from "$lib/interaction/context.svelte";

	import { NOT_WORK_HOUR_RANGES } from "./segment_layout/config";
	import { WeekSkeletonController } from "./skeleton/WeekSkeletonController.svelte";
	import { WeekController } from "./WeekController.svelte";

	import WeekSkeleton from "./skeleton/WeekSkeleton.svelte";
	import NowIndicator from "./skeleton/now_indicator/NowIndicator.svelte";
	import DayHeader from "./skeleton/DayHeader.svelte";
	import DayGrid from "./skeleton/DayGrid.svelte";
	import DragPreview from "./event/DragPreview.svelte";
	import EventSegment from "./event/EventSegment.svelte";
	import type { Store } from "$lib/states/meta/store.svelte";

	interface Props {
		store: Store;
		dayNum?: number;
	}

	let { store, dayNum }: Props = $props();

	const skeleton = new WeekSkeletonController(dayNum);
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
	<!-- skeleton:基于grid layout的定位系统 -->
	<WeekSkeleton {skeleton}>
		<!-- 当前时间指示线层 -->
		<NowIndicator {skeleton} nowPercentage={controller.nowPercentage} />

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

		<!-- 事件块：每个 PositionedSegment 渲染一个 EventSegment，跨天事件会有多个 -->
		{#each controller.positionedSegments as seg (seg.eventId + "-" + seg.dayIndex)}
			<EventSegment
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
	</WeekSkeleton>
</ScrollArea>
