<script lang="ts">
	/**
	 * 时间网格组件
	 *
	 * 由四层叠加组成（通过 z-index 分层），全部由 skeleton actions 定位：
	 *
	 * 层 1 (z:gridLines)    网格线层   — skeleton.timeAxis，col 1 全行，sticky
	 * 层 2 (z:labels)       标签层     — skeleton.timeAxis，覆盖在网格线上方
	 * 层 3 (z:nonWorkHours) 非工作时段  — skeleton.timeGridArea，48 行子网格
	 * 层 4 (z:dropZone)     拖放区     — skeleton.timeGrid + skeleton.measure，subgrid
	 *
	 * skeleton.measure 通过 ResizeObserver 将实际尺寸回传给 skeleton。
	 */
	import dayjs, { type Dayjs } from "dayjs";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { range, isRestDay } from "./layout/geometry";
	import { dayDropZone, dayExternalDropZone } from "./dropZone.svelte";
	import { WeekSkeleton } from "./WeekSkeleton.svelte";
	import type { DragService } from "$lib/interaction/services/DragService.svelte";

	interface Props {
		skeleton: WeekSkeleton;
		notWorkHourRange: ReadonlyArray<{ start: number; end: number }>;
		drag: DragService;
		onDragOver: (day: Dayjs, task: Task, topPx: number) => void;
		onDrop: (day: Dayjs, task: Task, topPx: number) => void;
		onDragEnd: () => void;
	}

	let {
		skeleton,
		notWorkHourRange,
		drag,
		onDragOver,
		onDrop,
		onDragEnd,
	}: Props = $props();
</script>

<!--
	层 1：网格线层（z:gridLines）
	skeleton.timeAxis 定位到 col 1, 全行, sticky, subgrid。
	23 条横向分割线通过 flex 等分布局，每条线向右延伸至视口宽度。
-->
<div
	data-tauri-drag-region
	use:skeleton.timeAxis
	class="rounded-lg"
	style:z-index={WeekSkeleton.layers.gridLines}
>
	<div class=" flex flex-col" style:grid-area="3 / 1 ">
		<div style:flex="1"></div>
		{#each range(1, 23)}
			<div
				style:flex="2"
				class="relative flex items-center justify-end text-xs"
			>
				<!-- 横向分割线：向右延伸至视口宽度 -->
				<div
					style:z-index="2"
					class=" absolute left-full top-1/2 h-0 w-dvw -translate-y-1/2 border-b border-zinc-300"
				></div>
			</div>
		{/each}
		<div style:flex="1"></div>
	</div>
</div>

<!--
	层 2：标签层（z:labels）
	同样使用 skeleton.timeAxis，覆盖在网格线上方。
	包含"全天"标签（grid-area: 2 / 1）和小时刻度（grid-area: 3 / 1）。
	hour 范围为 [1+offset, 23+offset]，hour % 24 处理 >24 的情况。
-->
<div
	data-tauri-drag-region
	use:skeleton.timeAxis
	class="bg-background shadow-xl rounded-tl-lg"
	style:z-index={WeekSkeleton.layers.labels}
>
	<!-- "全天"标签 + 上下分割线 -->
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

	<!-- 小时刻度：07:00 ~ 29:00（offsetByHour=6 时），格式化为 12 小时制 -->
	<div
		class=" z-10 flex flex-col font-extralight text-zinc-400"
		style:grid-area="3 / 1 "
	>
		<div style:flex="1"></div>
		{#each range(1 + skeleton.offsetByHour, 23 + skeleton.offsetByHour) as hour}
			<div
				style:flex="2"
				class="relative flex items-center justify-end text-xs"
			>
				<p class=" pr-2">
					{dayjs()
						.hour(hour % 24)
						.format("h A")}
				</p>
			</div>
		{/each}
		<div style:flex="1"></div>
	</div>
</div>

<!--
	层 3：非工作时段背景（z:nonWorkHours）
	skeleton.timeGridArea 定位到 cols 2+, row 3（无 subgrid，使用自定义 48 行网格）。
	grid-row 计算公式：(hour - offsetByHour) * 2 + 1，值可 >48 由 CSS 自动截断。
-->
<div
	use:skeleton.timeGridArea
	class="grid"
	style:z-index={WeekSkeleton.layers.nonWorkHours}
	style:grid-template-rows="repeat(48, 1fr)"
>
	{#each notWorkHourRange as range}
		<div
			style:grid-row="{(range.start - skeleton.offsetByHour) * 2 + 1} / {(range.end -
				skeleton.offsetByHour) *
				2 +
				1}"
			class="relative flex items-center justify-end text-xs bg-zinc-100"
		></div>
	{/each}
</div>

<!--
	层 4：拖放区（z:dropZone）
	skeleton.timeGrid 定位到 cols 2+, row 3, subgrid。
	skeleton.measure 通过 ResizeObserver 回传 dayHeight / containerWidth。
	每个日列注册为 interactjs + HTML5 DnD 双拖放目标。
-->
<div
	use:skeleton.timeGrid
	use:skeleton.measure
	style:z-index={WeekSkeleton.layers.dropZone}
>
	{#each skeleton.displayDays as day, i (day)}
		<div
			class="text-center {isRestDay(day) ? 'bg-zinc-300 opacity-30' : ''}"
			use:skeleton.dayColumn={i}
			use:dayDropZone
			use:dayExternalDropZone={{
				drag,
				onDragEnd() {
					onDragEnd();
				},
				onDragOver(task, topPx) {
					onDragOver(day, task, topPx);
				},
				onDrop(task, topPx) {
					onDrop(day, task, topPx);
				},
			}}
			data-dayts={day.valueOf()}
		></div>
	{/each}
</div>
