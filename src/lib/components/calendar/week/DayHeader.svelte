<script lang="ts">
	/**
	 * 日期表头组件
	 *
	 * 渲染星期 + 日期，高亮今天。使用 subgrid 与父网格的日列对齐。
	 * sticky top-0 固定在顶部，滚动时不消失。
	 * Focusable 组件用于首次加载时自动滚动到今天的位置。
	 */
	import dayjs, { type Dayjs } from "dayjs";
	import Focusable from "$lib/components/ui/focusable/Focusable.svelte";

	interface Props {
		displayDays: Dayjs[];
		offsetByHour: number;
		scrollStates: Record<string, { scrollTop: number; scrollLeft: number }>;
	}

	let { displayDays, offsetByHour, scrollStates }: Props = $props();
</script>

<!--
	日期表头（grid-row: 1）
	占据日列区域（grid-column: 2 / -1），使用 subgrid 与父网格对齐。
	sticky top-0 固定，z:11 确保覆盖事件块和网格线。
	header-shadow::after 伪元素提供底部渐变阴影。
-->
<div
	data-tauri-drag-region
	style:display="grid"
	style:grid-column="2 / -1"
	style:grid-row="1 / 1"
	style:grid-template-columns="subgrid"
	style:grid-template-rows="subgrid"
	class=" header-shadow sticky top-0 bg-background py-3 text-center text-zinc-700"
	style:z-index="11"
>
	{#each displayDays as day, i (day)}
		<div
			data-tauri-drag-region
			class=" flex flex-col items-center justify-between"
			style:grid-area="1 / {i + 1} / 1 / {i + 1}"
		>
			<!-- 星期：今天加粗红色，非今天细体 -->
			<div
				class="text-base font-medium"
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
			<!-- 首次加载时自动滚动到今天（仅当无滚动记忆时触发） -->
			<Focusable
				focus={!scrollStates["weekPanel"] &&
					day.isSame(
						dayjs().add(-offsetByHour, "hour"),
						"day",
					)}
				inline="center"
				block="start"
			/>

			<!-- 日期：MM-DD 格式 -->
			<div
				style:font-size="0.7rem"
				class=" text-xs font-extralight text-zinc-400"
			>
				{day.format("MM-DD")}
			</div>
		</div>
	{/each}
</div>

<style>
	/* 表头底部渐变阴影，增加与时间网格的视觉分离 */
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
