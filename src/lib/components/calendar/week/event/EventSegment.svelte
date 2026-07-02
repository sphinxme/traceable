<script lang="ts">
	/**
	 * 单个事件片段的渲染组件（薄视图）
	 *
	 * 接收 PositionedSegment（由布局引擎预先计算好定位信息），
	 * 创建 EventSegmentController 管理交互状态，通过 controller.action 绑定 interactjs。
	 *
	 * 宏观定位（grid-row, grid-column）由 skeleton.eventSlot action 处理。
	 * 微观定位（translateY, height, width, left）由控制器状态驱动。
	 */
	import dayjs from "dayjs";

	import * as ContextMenu from "$lib/components/ui/context-menu";
	import {
		PopoverTooltipController,
		Content as PopoverTooltipContent,
	} from "$lib/components/ui/popover-tooltip";

	import { getInteractionContext } from "$lib/interaction/context.svelte";
	import {
		getLaneGeometry,
		type PositionedSegment,
	} from "../segment_layout/layout";
	import { formatDuration } from "../format";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { Redo2 } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import { WeekSkeletonController } from "../skeleton/WeekSkeletonController.svelte";
	import {
		EventSegmentController,
	} from "./EventSegmentController.svelte";

	interface Props {
		skeleton: WeekSkeletonController;
		segment: PositionedSegment;
		task: Task;
		snapsOffset: number[];
	}

	let { skeleton, segment, task, snapsOffset }: Props = $props();

	const { focus } = getInteractionContext();

	let container: HTMLDivElement;

	// ── 视图特有的响应式状态（不属于控制器） ──

	const event = $derived(segment.event);
	const highlight = $derived(focus.highlight[event.id]);
	const focusMe = $derived(focus.focusing[event.id] || false);
	$effect(() => {
		if (focusMe) {
			container.scrollIntoView({
				behavior: "smooth",
				inline: "center",
				block: "center",
			});
			focus.focusing[event.id] = false;
		}
	});
	const parentTasks = $derived(task.parents);

	const tooltip = new PopoverTooltipController({ delayDuration: 0 });

	// ── 交互控制器 ──

	const controller = new EventSegmentController();

	/** segment 或上下文变化时同步控制器（布局重算/拖拽结束后触发） */
	$effect(() => {
		controller.updateContext(
			skeleton.dayHeight,
			snapsOffset,
			skeleton.getColumnIndex,
			segment.segStart,
			segment.event,
			task,
		);
		controller.syncToSegment(
			segment.segStart,
			segment.segEnd,
			segment.dayIndex,
			skeleton.offsetByHour,
			skeleton.dayHeight,
		);
	});

	/** 重叠分列的宽度与左偏移 */
	const laneGeometry = $derived(getLaneGeometry(segment, skeleton.dayWidth));
</script>

<!--
	事件块根容器
	skeleton.eventSlot 定位到 grid-row 3, grid-column = columnIndex+2, absolute。
	微观定位通过 translateY / height / width / left 实现。
	use:controller.action 绑定拖拽/缩放/点击交互。
	use:tooltipTrigger 绑定 hover 显隐 tooltip。
-->
<div
	bind:this={container}
	use:skeleton.eventSlot={controller.state.columnIndex}
	use:controller.action={segment.isLast}
	use:tooltip.trigger
	style:z-index={WeekSkeletonController.layers.events}
	style:padding="2px"
	class="border-1 ease-out grow-0 hover:opacity-90 overflow-visible text-sm text-zinc-50 opacity-75"
	style:transition-property="transform, opacity"
	style:transition-duration="150ms"
	style:transform="translateY({controller.state.topOffset}px) {highlight
		? 'scale(1.10)'
		: ''}"
	style:height="{controller.state.eventHeight}px"
	style:width="{laneGeometry.width}px"
	style:left="{laneGeometry.left}px"
>
	<ContextMenu.Root>
		<ContextMenu.Trigger
			class="flex h-full p-2  rounded-lg w-full relative flex-col text-left overflow-clip {task.isCompleted
				? 'bg-zinc-400'
				: 'bg-zinc-600'} {highlight
				? ' shadow-2xl shadow-zinc-700'
				: ''}"
		>
			{#if controller.state.isResizing}
				<!-- 缩放预览：显示起止时间和时长 -->
				<div
					transition:fade={{ duration: 300 }}
					class=" pb-2 absolute flex-col flex items-start justify-between h-full text-xs font-light"
				>
					<div>
						{dayjs(controller.state.previewStart).format("HH:mm")}
					</div>
					<div>
						{formatDuration(
							controller.state.previewEnd -
								controller.state.previewStart,
						)}
					</div>
					<div>
						{dayjs(controller.state.previewEnd).format("HH:mm")}
					</div>
				</div>
			{:else}
				<!-- 默认状态：显示任务标题、时间、父任务 -->
				<div
					class=" absolute h-full"
					transition:fade={{ duration: 300 }}
				>
					<div class="break-words pb-1 text-wrap text-ellipsis">
						{task.$text}
					</div>
					<div class=" text-xs pb-3 font-extralight">
						{dayjs(controller.state.previewStart).format("HH:mm")}
						-
						{dayjs(controller.state.previewEnd).format("HH:mm")}
					</div>
					{#each parentTasks as parentTask}
						<p
							class=" text-xs whitespace-nowrap overflow-hidden text-ellipsis font-extralight inline w-full"
						>
							<Redo2 class="inline" size="10" />
							{parentTask.$text}
						</p>
					{/each}
				</div>
			{/if}
		</ContextMenu.Trigger>
		<!-- 右键菜单：删除事件 -->
		<ContextMenu.Content>
			<ContextMenu.Item onclick={() => event.delete()}>
				删除
			</ContextMenu.Item>
		</ContextMenu.Content>
	</ContextMenu.Root>
</div>

<!-- 悬停 Tooltip：显示完整信息（父任务、标题、笔记、时间） -->
<PopoverTooltipContent {tooltip} class="p-2 max-w-60 " sideOffset={8}>
	{#each parentTasks as parentTask}
		<p class="text-xs inline">
			<Redo2 class="inline" size="10" />
			{parentTask.$text}
		</p>
	{/each}

	<div class="break-words font-semibold">
		{task.$text}
	</div>

	<p
		class=" pt-2 text-nowrap text-zinc-500 whitespace-pre-line overflow-hidden overflow-ellipsis"
	>
		{task.$note}
	</p>

	<div class=" pt-2 text-xs font-extralight">
		{dayjs(controller.state.previewStart).format("HH:mm")}
		-
		{dayjs(controller.state.previewEnd).format("HH:mm")}
	</div>
</PopoverTooltipContent>
