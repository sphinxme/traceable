<script lang="ts">
	/**
	 * EventIndicator — 日历事件指示器。
	 *
	 * 在 TodoItem 下方显示与当前任务关联的日历事件（Event），
	 * 以彩色横条形式展示，宽度按事件时长计算（每 2 分钟 1px）。
	 *
	 * **交互**：
	 * - Hover → `eventHighlight.setHighlight(eventId, true)` 高亮日历中的对应事件段
	 * - Click → `eventHighlight.requestFocus(eventId)` 滚动到日历中的对应事件段
	 *
	 * **HoverCard**：悬停时显示事件的时间信息（日期、时间段、时长）。
	 *
	 * @prop data - Event 实体
	 * @prop isCompleted - 当前任务是否已完成（影响样式）
	 */
	import * as HoverCard from "$lib/components/ui/hover-card";
	import type { Event } from "$lib/states/meta/event.svelte";
	import { getInteractionContext } from "$lib/interaction/context.svelte";
	import dayjs from "dayjs";

	interface Props {
		data: Event;
		isCompleted: boolean;
	}

	let { data, isCompleted }: Props = $props();
	let length = $derived((data.end - data.start) / (1000 * 60 * 2)); // 10分钟5px

	const { eventHighlight } = getInteractionContext();

	function formatDuration(duration: number): string {
		const hours = Math.floor(duration / (60 * 60 * 1000));
		const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));

		if (hours === 0) {
			return `${minutes}分钟`;
		}
		if (minutes === 0) {
			return `${hours}小时`;
		}
		if (minutes === 30) {
			return `${hours}.5小时`;
		}

		return `${hours}小时${minutes}分钟`;
	}
</script>

<div
	style:width={length + "px"}
	class="parent z-40 mr-1 transition"
	style:transition-property="width, margin"
>
	<HoverCard.Root
		openDelay={0}
		closeDelay={0}
		onOpenChange={(open) => {
			eventHighlight.setHighlight(data.id, open);
		}}
	>
		<HoverCard.Trigger
			onclick={() => {
				eventHighlight.requestFocus(data.id);
			}}
		>
			<div
				class=" opacity-70 indicator h-1 w-full cursor-pointer rounded-full bg-zinc-600 transition-all duration-100"
			></div>
		</HoverCard.Trigger>
		<HoverCard.Content side="top" sideOffset={24}>
			<div class=" text-sm font-semibold">
				{dayjs(data.start).format("YYYY-MM-DD")}
			</div>
			<div class=" text-xs font-semibold">
				{dayjs(data.start).format("HH:mm")} -
				{dayjs(data.end).format("HH:mm")}
			</div>
			<div>{formatDuration(data.end - data.start)}</div>
		</HoverCard.Content>
	</HoverCard.Root>
</div>

<style>
	.parent:hover .indicator {
		height: 6px;
		opacity: 80%;
	}
	.parent:hover {
		margin-right: 6px;
	}
</style>
