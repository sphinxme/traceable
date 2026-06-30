<script lang="ts">
	/**
	 * 从 Todo 列表拖入日历时的预览块
	 *
	 * 显示 30 分钟默认时长的事件预览（15 分钟对齐），
	 * 仅在 draggingTaskEvent 非空时渲染。
	 * pointer-events: none 确保不干扰拖拽操作。
	 */
	import dayjs from "dayjs";
	import { calculateTopOffset } from "../shared/geometry";
	import { DEFAULT_EVENT_DURATION_MS, MS_PER_DAY } from "../shared/config";
	import type { DraggingTaskEvent } from "./WeekController.svelte";

	interface Props {
		draggingTaskEvent: DraggingTaskEvent | null;
		getColumnIndex: (t: number) => number;
		offsetByHour: number;
		dayHeight: number;
	}

	let { draggingTaskEvent, getColumnIndex, offsetByHour, dayHeight }: Props =
		$props();
</script>

{#if draggingTaskEvent}
	<!-- 预览块：定位到拖拽悬停的日列和时间位置 -->
	<div
		style:pointer-events="none"
		style:z-index="12"
		style:box-shadow="0px 0px 16px 0px rgb(212,212,216,0.8) inset"
		class=" relative text-zinc-700 rounded-lg shadow-inner text-center font-extralight"
		style:grid-row="3"
		style:grid-column={getColumnIndex(draggingTaskEvent.start) + 2}
		style:top="{calculateTopOffset(
			draggingTaskEvent.start,
			offsetByHour,
			dayHeight,
		)}px"
		style:height="{Math.floor((DEFAULT_EVENT_DURATION_MS / MS_PER_DAY) * dayHeight)}px"
	>
		{dayjs(draggingTaskEvent.start).format("HH:mm")}-{dayjs(
			draggingTaskEvent.end,
		).format("HH:mm")}
	</div>
{/if}
