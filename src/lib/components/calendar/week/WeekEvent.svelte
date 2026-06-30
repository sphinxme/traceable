<script lang="ts">
	/**
	 * 单个事件片段的渲染组件（薄视图）
	 *
	 * 接收 PositionedSegment（由布局引擎预先计算好定位信息），
	 * 创建 WeekEventController 管理交互状态，通过 eventInteract action 绑定 interactjs。
	 *
	 * 一个跨天事件会渲染多个 WeekEvent 实例（每个 segment 一个），
	 * 它们共享同一个 event 引用，操作任一 segment 的拖拽/resize 都
	 * 作用于底层 Event 对象。
	 */
	import dayjs from "dayjs";

	import * as ContextMenu from "$lib/components/ui/context-menu";
	import * as Tooltip from "$lib/components/ui/tooltip";

	import { getInteractionContext } from "$lib/interaction/context.svelte";
	import { getLaneGeometry, type PositionedSegment } from "../shared/layout";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { Redo2 } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import { WeekEventController } from "./WeekEventController.svelte";
	import {
		eventInteract,
		type EventInteractParams,
	} from "./eventInteract.svelte";

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

	// ── 交互控制器 ──

	const controller = new WeekEventController();

	/** segment 或上下文变化时同步控制器（布局重算/拖拽结束后触发） */
	$effect(() => {
		controller.updateContext(
			dayHeight,
			snapsOffset,
			getColumnIndex,
			segment.segStart,
		);
		controller.syncToSegment(
			segment.segStart,
			segment.segEnd,
			segment.dayIndex,
			offsetByHour,
			dayHeight,
		);
	});

	/** 重叠分列的宽度与左偏移 */
	const laneGeometry = $derived(getLaneGeometry(segment, dayWidth));

	/** eventInteract action 的参数（segment 变化时通过 $derived 更新） */
	const interactParams = $derived<EventInteractParams>({
		ctrl: controller,
		event: segment.event,
		task,
		isLast: segment.isLast,
	});

	/** 将毫秒时长格式化为中文可读字符串（如 "1.5小时"、"30分钟"） */
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

<!--
	事件块根容器
	通过 CSS Grid 定位（grid-row: 3, grid-column 由 columnIndex 决定），
	absolute + translateY 实现垂直偏移。
	宽度和左偏移由重叠分列（laneGeometry）计算。
	use:eventInteract 绑定拖拽/缩放/点击交互。
-->
<div
	bind:this={container}
	use:eventInteract={interactParams}
	style:z-index="8"
	style:padding="2px"
	class="border-1 z-10 absolute ease-out grow-0 hover:opacity-90 overflow-visible text-sm text-zinc-50 opacity-75"
	style:grid-row="3"
	style:transition-property="transform, opacity"
	style:transition-duration="150ms"
	style:grid-column="{controller.state.columnIndex + 2} / {controller.state
		.columnIndex + 2}"
	style:transform="translateY({controller.state.topOffset}px) {highlight
		? 'scale(1.10)'
		: ''}"
	style:height="{controller.state.eventHeight}px"
	style:width="{laneGeometry.width}px"
	style:left="{laneGeometry.left}px"
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
						{#if controller.state.isResizing}
							<!-- 缩放预览：显示起止时间和时长 -->
							<div
								transition:fade={{ duration: 300 }}
								class=" pb-2 absolute flex-col flex items-start justify-between h-full text-xs font-light"
							>
								<div>
									{dayjs(
										controller.state.previewStart,
									).format("HH:mm")}
								</div>
								<div>
									{formatDuration(
										controller.state.previewEnd -
											controller.state.previewStart,
									)}
								</div>
								<div>
									{dayjs(controller.state.previewEnd).format(
										"HH:mm",
									)}
								</div>
							</div>
						{:else}
							<!-- 默认状态：显示任务标题、时间、父任务 -->
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
									{dayjs(
										controller.state.previewStart,
									).format("HH:mm")}
									-
									{dayjs(controller.state.previewEnd).format(
										"HH:mm",
									)}
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
			</Tooltip.Trigger>
			<!-- 悬停 Tooltip：显示完整信息（父任务、标题、笔记、时间） -->
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
					{dayjs(controller.state.previewStart).format("HH:mm")}
					-
					{dayjs(controller.state.previewEnd).format("HH:mm")}
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
