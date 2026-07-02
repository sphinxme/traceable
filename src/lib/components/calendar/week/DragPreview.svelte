<script lang="ts">
	/**
	 * 从 Todo 列表拖入日历时的预览块
	 *
	 * 显示 30 分钟默认时长的事件预览（15 分钟对齐），
	 * 仅在 draggingTaskEvent 非空时渲染。
	 * pointer-events: none 确保不干扰拖拽操作。
	 *
	 * 宏观定位由 skeleton.eventSlot 处理，微观定位（top, height）由时间计算驱动。
	 */
	import dayjs from "dayjs";
	import { calculateTopOffset } from "./layout/geometry";
	import { DEFAULT_EVENT_DURATION_MS, MS_PER_DAY } from "./layout/config";
	import { WeekSkeleton } from "./WeekSkeleton.svelte";
	import type { DraggingTaskEvent } from "./WeekController.svelte";

	interface Props {
		skeleton: WeekSkeleton;
		draggingTaskEvent: DraggingTaskEvent | null;
	}

	let { skeleton, draggingTaskEvent }: Props = $props();
</script>

{#if draggingTaskEvent}
	<!-- 预览块：定位到拖拽悬停的日列和时间位置 -->
	<div
		use:skeleton.eventSlot={skeleton.getColumnIndex(draggingTaskEvent.start)}
		style:pointer-events="none"
		style:z-index={WeekSkeleton.layers.dragPreview}
		style:box-shadow="0px 0px 16px 0px rgb(212,212,216,0.8) inset"
		class=" relative text-zinc-700 rounded-lg shadow-inner text-center font-extralight"
		style:top="{calculateTopOffset(
			draggingTaskEvent.start,
			skeleton.offsetByHour,
			skeleton.dayHeight,
		)}px"
		style:height="{Math.floor(
			(DEFAULT_EVENT_DURATION_MS / MS_PER_DAY) * skeleton.dayHeight,
		)}px"
	>
		{dayjs(draggingTaskEvent.start).format("HH:mm")}-{dayjs(
			draggingTaskEvent.end,
		).format("HH:mm")}
	</div>
{/if}
