<script lang="ts">
	/**
	 * 单个事件片段的渲染组件。
	 *
	 * 改造历史：原 WeekEvent 直接接收 Event 并自行计算位置（单列单段）。
	 * 现在改为接收 PositionedSegment，定位信息（dayIndex / segStart / segEnd /
	 * laneIndex / laneCount）由布局引擎 layout.ts 预先计算好。
	 *
	 * 一个跨天事件会渲染多个 WeekEvent 实例（每个 segment 一个），
	 * 它们共享同一个 event 引用，操作任一 segment 的拖拽/resize 都
	 * 作用于底层 Event 对象。
	 */
	import dayjs from "dayjs";

	import * as ContextMenu from "$lib/components/ui/context-menu";
	import * as Tooltip from "$lib/components/ui/tooltip";

	import {
		getInteractionContext,
	} from "$lib/interaction/context.svelte";
	import {
		calculateTopOffset2,
		calculateEventHeight,
	} from "./geometry";
	import type { PositionedSegment } from "./layout";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { CornerLeftUp, Redo2 } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import {
		useEventInteract,
		type UseEventInteractParams,
	} from "./useEventInteract.svelte";

	interface Props {
		dayHeight: number;
		dayWidth: number;
		segment: PositionedSegment;
		task: Task;
		offsetByHour: number;
		snapsOffset: number[];
		getColumnIndex: (t: number) => number;
	}

	let {
		dayHeight,
		dayWidth,
		segment,
		task,
		offsetByHour,
		getColumnIndex,
		snapsOffset,
	}: Props = $props();

	const { focus } = getInteractionContext();

	let container: HTMLDivElement;

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
	let parentTasks = task.parents;

	/**
	 * 从 segment 获取定位参数。
	 *
	 * 注意：所有定位基于 segStart/segEnd（已裁剪到当天边界），
	 * 而非 event.start/event.end（原始事件时间）。
	 * 这样跨天事件的每个 segment 只在自己所属的日列内显示。
	 *
	 * 拖拽过程中 topOffset / eventHeight / columnIndex / previewStart /
	 * previewEnd 会被 useEventInteract 的回调即时覆盖。
	 */
	let topOffset = $state(
		calculateTopOffset2(segment.segStart, offsetByHour, dayHeight),
	);
	let eventHeight = $state(
		calculateEventHeight(segment.segStart, segment.segEnd, dayHeight),
	);
	let columnIndex = $state(segment.dayIndex);
	let previewStart = $state(segment.segStart);
	let previewEnd = $state(segment.segEnd);
	let clickCount = $state(0);
	let isResizing = $state(false);

	$effect(() => {
		topOffset = calculateTopOffset2(
			segment.segStart,
			offsetByHour,
			dayHeight,
		);
		eventHeight = calculateEventHeight(
			segment.segStart,
			segment.segEnd,
			dayHeight,
		);
		columnIndex = segment.dayIndex;
		previewStart = segment.segStart;
		previewEnd = segment.segEnd;
	});

	/**
	 * 重叠分列的宽度与左偏移。
	 *
	 * laneWidth = dayWidth / laneCount：同一重叠簇内所有 segment 等宽并排。
	 * laneLeft = laneIndex * laneWidth：从左到右排列。
	 */
	let laneWidth = $derived(
		Math.floor(dayWidth / segment.laneCount),
	);
	let laneLeft = $derived(segment.laneIndex * laneWidth);

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

	/**
	 * 传给 useEventInteract action 的参数集。
	 *
	 * 使用 $derived 而非常量，确保 segment 变化时（如布局重算后 laneCount 改变）
	 * interact.js 能拿到最新的 isLast / getSegStart 值。
	 */
	const interactParams: UseEventInteractParams = $derived({
		event: segment.event,
		task,
		getDayHeight: () => dayHeight,
		getSnapsOffset: () => snapsOffset,
		getColumnIndex,
		getTopOffset: () => topOffset,
		getEventHeight: () => eventHeight,
		setTopOffset: (v) => (topOffset = v),
		setEventHeight: (v) => (eventHeight = v),
		setColumnIndex: (v) => (columnIndex = v),
		setPreviewStart: (v) => (previewStart = v),
		setPreviewEnd: (v) => (previewEnd = v),
		setIsResizing: (v) => (isResizing = v),
		bumpClickCount: () => ++clickCount,
		getSegStart: () => segment.segStart,
		isLast: segment.isLast,
	});
</script>

<div
	bind:this={container}
	use:useEventInteract={interactParams}
	style:z-index="8"
	style:padding="2px"
	class="border-1 z-10 absolute ease-out grow-0 hover:opacity-90 overflow-visible text-sm text-zinc-50 opacity-75"
	style:grid-row="3"
	style:transition-property="transform, opacity"
	style:transition-duration="150ms"
	style:grid-column="{columnIndex + 2} / {columnIndex + 2}"
	style:transform="translateY({topOffset}px) {highlight ? 'scale(1.10)' : ''}"
	style:height="{eventHeight}px"
	style:width="{laneWidth}px"
	style:left="{laneLeft}px"
>
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={0}>
			<Tooltip.Trigger class="h-full w-full">
				<ContextMenu.Root>
					<ContextMenu.Trigger
						class="flex h-full p-2  rounded-lg w-full relative flex-col text-left overflow-clip {task.isCompleted
							? 'bg-zinc-400'
							: 'bg-zinc-600'} {highlight
							? ' shadow-2xl shadow-zinc-700'
							: ''}"
					>
						{#if isResizing}
							<!-- 垂直居中 -->
							<div
								transition:fade={{ duration: 300 }}
								class=" pb-2 absolute flex-col flex items-start justify-between h-full text-xs font-light"
							>
								<div>
									{dayjs(previewStart).format("HH:mm")}
								</div>
								<div>
									{formatDuration(previewEnd - previewStart)}
								</div>
								<div>
									{dayjs(previewEnd).format("HH:mm")}
								</div>
							</div>
						{:else}
							<div
								class=" absolute h-full"
								transition:fade={{ duration: 300 }}
							>
								<div
									class="break-words pb-1 text-wrap text-ellipsis"
								>
									{task.$text}
								</div>
								<div class=" text-xs pb-3 font-extralight">
									{dayjs(previewStart).format("HH:mm")}
									-
									{dayjs(previewEnd).format("HH:mm")}
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
					<ContextMenu.Content>
						<ContextMenu.Item onclick={() => event.delete()}>
							删除
						</ContextMenu.Item>
					</ContextMenu.Content>
				</ContextMenu.Root>
			</Tooltip.Trigger>
			<Tooltip.Content class="p-2 z-20 max-w-60 " sideOffset={8}>
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
					{dayjs(previewStart).format("HH:mm")}
					-
					{dayjs(previewEnd).format("HH:mm")}
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
