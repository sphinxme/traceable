<script lang="ts">
  /**
   * 单个事件片段的渲染组件（薄视图）
   *
   * 接收 PositionedSegment（由布局引擎预先计算好定位信息），
   * 创建 EventSegmentController 管理交互状态，通过 controller.action 绑定 interactjs。
   *
   * 三层定位模型（详见 WeekSkeletonController）：
   * | 层 | 机制 | 数据来源 | 样式属性 |
   * |----|------|---------|---------|
   * | 1. Grid 定位 | eventSlot action | segment.dayIndex | grid-column, grid-row, position:absolute |
   * | 2. 垂直像素 | controller.state | segStart/segEnd → fractionOfDay × dayHeight | translateY, height |
   * | 3. 水平分列 | getLaneGeometry | laneIndex/laneCount → dayWidth / laneCount | width, left |
   */
  import dayjs from "dayjs";

  import * as ContextMenu from "$lib/components/ui/context-menu";
  import {
    PopoverTooltipController,
    Content as PopoverTooltipContent,
  } from "$lib/components/ui/popover-tooltip";

  import { getAppServices } from "$lib/app/context.svelte";
  import type { SegmentHandle } from "$lib/interaction/segment-registry";
  import type { WeekPanelController } from "../WeekPanelController.svelte";
  import {
    getLaneGeometry,
    type PositionedSegment,
  } from "../segment_layout/layout";
  import { formatDuration } from "../format";
  import type { Task } from "$lib/document/entities/task.svelte";
  import { Redo2 } from "@lucide/svelte";
  import { fade } from "svelte/transition";
  import { WeekSkeletonController } from "../skeleton/WeekSkeletonController.svelte";
  import { EventSegmentController } from "./EventSegmentController.svelte";

  interface Props {
    skeleton: WeekSkeletonController;
    segment: PositionedSegment;
    task: Task;
    snapsOffset: number[];
    weekPanel: WeekPanelController;
  }

  let { skeleton, segment, task, snapsOffset, weekPanel }: Props = $props();

  const services = getAppServices();

  let container: HTMLDivElement;

  // ── 视图特有的响应式状态（不属于控制器） ──

  const event = $derived(segment.event);
  const highlight = $derived(weekPanel.isHighlighted(event.id));
  const parentTasks = $derived(task.parents);

  const segmentHandle: SegmentHandle = {
    get eventId() {
      return event.id;
    },
    get dayIndex() {
      return segment.dayIndex;
    },
    get segStart() {
      return segment.segStart;
    },
    scrollIntoView() {
      container.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "center",
      });
    },
    setHighlight(_on: boolean) {},
  };

  $effect(() => {
    weekPanel.segments.register(segmentHandle);
    return () => weekPanel.segments.unregister(segmentHandle);
  });

  const tooltip = new PopoverTooltipController({ delayDuration: 0 });

  // ── 交互控制器 ──

  const controller = new EventSegmentController();
  controller.onTapAction = (task) => services.facade.focusTask(task.id);

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
  class="grow-0 overflow-visible text-sm text-zinc-50 opacity-75 ease-out hover:opacity-90"
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
      class="relative flex h-full  w-full flex-col overflow-clip rounded-lg p-2 text-left {task.isCompleted
        ? 'bg-zinc-400'
        : 'bg-zinc-600'} {highlight ? ' shadow-2xl shadow-zinc-700' : ''}"
    >
      {#if controller.state.isResizing}
        <!-- 缩放预览：显示起止时间和时长 -->
        <div
          transition:fade={{ duration: 300 }}
          class=" absolute flex h-full flex-col items-start justify-between pb-2 text-xs font-light"
        >
          <div>
            {dayjs(controller.state.previewStart).format("HH:mm")}
          </div>
          <div>
            {formatDuration(
              controller.state.previewEnd - controller.state.previewStart,
            )}
          </div>
          <div>
            {dayjs(controller.state.previewEnd).format("HH:mm")}
          </div>
        </div>
      {:else}
        <!-- 默认状态：显示任务标题、时间、父任务 -->
        <div class=" absolute h-full" transition:fade={{ duration: 300 }}>
          <div class="text-ellipsis text-wrap break-words pb-1">
            {task.$text}
          </div>
          <div class=" pb-3 text-xs font-extralight">
            {dayjs(controller.state.previewStart).format("HH:mm")}
            -
            {dayjs(controller.state.previewEnd).format("HH:mm")}
          </div>
          {#each parentTasks as parentTask}
            <p
              class=" inline w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs font-extralight"
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
      <ContextMenu.Item onclick={() => event.delete()}>删除</ContextMenu.Item>
    </ContextMenu.Content>
  </ContextMenu.Root>
</div>

<!-- 悬停 Tooltip：显示完整信息（父任务、标题、笔记、时间） -->
<PopoverTooltipContent {tooltip} class="max-w-60 p-2 " sideOffset={8}>
  {#each parentTasks as parentTask}
    <p class="inline text-xs">
      <Redo2 class="inline" size="10" />
      {parentTask.$text}
    </p>
  {/each}

  <div class="break-words font-semibold">
    {task.$text}
  </div>

  <p
    class=" overflow-hidden text-ellipsis whitespace-pre-line text-nowrap pt-2 text-zinc-500"
  >
    {task.$note}
  </p>

  <div class=" pt-2 text-xs font-extralight">
    {dayjs(controller.state.previewStart).format("HH:mm")}
    -
    {dayjs(controller.state.previewEnd).format("HH:mm")}
  </div>
</PopoverTooltipContent>
