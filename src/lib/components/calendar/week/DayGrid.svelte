<script lang="ts">
	/**
	 * 时间网格组件
	 *
	 * 由四层 CSS Grid 叠加组成（通过 z-index 分层），全部使用 subgrid 与父网格对齐：
	 *
	 * 层 1 (z:2)  网格线层   — 横向分割线，贯穿全宽，sticky 固定在左侧
	 * 层 2 (z:10) 标签层     — 小时刻度 + "全天"标签，覆盖在网格线上方，sticky
	 * 层 3 (z:1)  非工作时段  — 灰色背景，48 行网格（每行 30 分钟）
	 * 层 4 (z:7)  拖放区     — 每个日列注册为 interactjs + HTML5 DnD 双拖放目标
	 *
	 * 通过 bind:offsetHeight / bind:offsetWidth 将实际尺寸回传给 WeekController。
	 */
	import dayjs, { type Dayjs } from "dayjs";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { range, isRestDay } from "./layout/geometry";
	import { dayDropZone, dayExternalDropZone } from "./dropZone.svelte";
	import type { DragService } from "$lib/interaction/services/DragService.svelte";

	interface Props {
		displayDays: Dayjs[];
		offsetByHour: number;
		notWorkHourRange: ReadonlyArray<{ start: number; end: number }>;
		dayHeight: number;
		containerWidth: number;
		drag: DragService;
		onDragOver: (day: Dayjs, task: Task, topPx: number) => void;
		onDrop: (day: Dayjs, task: Task, topPx: number) => void;
		onDragEnd: () => void;
	}

	let {
		displayDays,
		offsetByHour,
		notWorkHourRange,
		dayHeight = $bindable(),
		containerWidth = $bindable(),
		drag,
		onDragOver,
		onDrop,
		onDragEnd,
	}: Props = $props();
</script>

<!--
	层 1：网格线层（z:2）
	占据左侧时间轴列（grid-column: 1），跨全部行（grid-row: 1 / -1）。
	使用 subgrid 与父网格对齐。23 条横向分割线通过 flex 等分布局，
	每条线向右延伸至视口宽度（w-dvw）形成贯穿效果。
	sticky 固定在左侧，滚动时不消失。
-->
<div
	data-tauri-drag-region
	style:display="grid"
	style:grid-column="1 / 1"
	style:grid-row="1 / -1"
	style:grid-template-columns="subgrid"
	style:grid-template-rows="subgrid"
	class="sticky left-0 rounded-lg"
	style:z-index="2"
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
	层 2：标签层（z:10）
	同样占据左侧时间轴列，覆盖在网格线上方。
	包含"全天"标签（grid-area: 2 / 1）和小时刻度（grid-area: 3 / 1）。
	hour 范围为 [1+offset, 23+offset]，hour % 24 处理 >24 的情况。
	sticky 固定，带背景色和阴影遮盖下方的网格线。
-->
<div
	data-tauri-drag-region
	style:display="grid"
	style:grid-column="1 / 1"
	style:grid-row="1 / -1"
	style:grid-template-columns="subgrid"
	style:grid-template-rows="subgrid"
	class="sticky z-10 left-0 bg-background shadow-xl rounded-tl-lg"
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
		{#each range(1 + offsetByHour, 23 + offsetByHour) as hour}
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
	层 3：非工作时段背景（z:1）
	占据日列区域（grid-column: 2 / -1），时间网格行（grid-row: 3）。
	48 行网格（每行 30 分钟），非工作时段显示灰色背景。
	grid-row 计算公式：(hour - offsetByHour) * 2 + 1，值可 >48 由 CSS 自动截断。
-->
<div
	style:grid-column="2 / -1"
	style:grid-row="3 / 3"
	class=" grid"
	style:z-index="1"
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

<!--
	层 4：拖放区（z:7）
	占据日列区域，使用 subgrid 与父网格对齐。
	每个日列注册为 interactjs + HTML5 DnD 双拖放目标。
	通过 bind:offsetHeight / bind:offsetWidth 回传实际尺寸给 WeekController。
	data-dayts 存储日列时间戳，供事件拖拽时读取目标日列。
-->
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
			class="text-center {isRestDay(day) ? 'bg-zinc-300 opacity-30' : ''}"
			style:grid-area="1 / {i + 1} / 1 / {i + 1}"
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
