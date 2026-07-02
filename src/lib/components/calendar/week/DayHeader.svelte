<script lang="ts">
	/**
	 * 日期表头组件
	 *
	 * 渲染星期 + 日期，高亮今天。
	 * 由 skeleton.header 定位到 cols 2+, row 1, sticky, subgrid。
	 */
	import dayjs from "dayjs";
	import { WeekSkeleton } from "./WeekSkeleton.svelte";

	interface Props {
		skeleton: WeekSkeleton;
	}

	let { skeleton }: Props = $props();
</script>

<!--
	日期表头
	skeleton.header 定位到 grid-column 2/-1, grid-row 1, sticky, subgrid, z:header。
	header-shadow::after 伪元素提供底部渐变阴影。
-->
<div
	data-tauri-drag-region
	use:skeleton.header
	class=" header-shadow bg-background py-3 text-center text-zinc-700"
>
	{#each skeleton.displayDays as day, i (day)}
		<div
			data-tauri-drag-region
			use:skeleton.dayColumn={i}
			class=" flex flex-col items-center justify-between"
		>
			<!-- 星期：今天加粗红色，非今天细体 -->
			<div
				class="text-base font-medium"
				class:font-light={!day.isSame(
					dayjs().add(-skeleton.offsetByHour, "hour"),
					"day",
				)}
				class:text-red-500={day.isSame(
					dayjs().add(-skeleton.offsetByHour, "hour"),
					"day",
				)}
			>
				{day.format("ddd")}
		</div>
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
