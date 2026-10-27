<script lang="ts">
	/**
	 * 从 Todo 列表拖入日历时的预览块
	 *
	 * 显示 30 分钟默认时长的事件预览（15 分钟对齐），
	 * 仅在 draggingTaskEvent 非空时渲染。
	 * pointer-events: none 确保不干扰拖拽操作。
	 *
	 * 复用三层定位模型：第 1 层由 skeleton.eventSlot 处理（Grid 定位到日列），
	 * 第 2 层由 calculateTopOffset/calculateEventHeight 计算（像素级垂直定位）。
	 * 与 EventSegment 不同，预览块无需第 3 层（不涉及重叠分列）。
	 */
	import dayjs from "dayjs";
	import { calculateTopOffset, calculateEventHeight } from "../segment_layout/geometry";
	import { WeekSkeletonController } from "../skeleton/WeekSkeletonController.svelte";
	import type { DraggingTaskEvent } from "../WeekController.svelte";

	interface Props {
		skeleton: WeekSkeletonController;
		draggingTaskEvent: DraggingTaskEvent | null;
	}

	let { skeleton, draggingTaskEvent }: Props = $props();
</script>

{#if draggingTaskEvent}
	<!-- 预览块：定位到拖拽悬停的日列和时间位置 -->
	<div
		use:skeleton.eventSlot={skeleton.getColumnIndex(
			draggingTaskEvent.start,
		)}
		style:pointer-events="none"
		style:z-index={WeekSkeletonController.layers.dragPreview}
		style:box-shadow="0px 0px 16px 0px rgb(212,212,216,0.8) inset"
		class=" relative text-zinc-700 rounded-lg shadow-inner text-center font-extralight"
		style:top="{calculateTopOffset(
			draggingTaskEvent.start,
			skeleton.offsetByHour,
			skeleton.dayHeight,
		)}px"
		style:height="{calculateEventHeight(
			draggingTaskEvent.start,
			draggingTaskEvent.end,
			skeleton.dayHeight,
		)}px"
	>
		{dayjs(draggingTaskEvent.start).format("HH:mm")}-{dayjs(
			draggingTaskEvent.end,
		).format("HH:mm")}
	</div>
{/if}
