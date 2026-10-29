<script lang="ts">
  /**
   * 周视图主组件
   *
   * Skeleton-Controller-Svelte 三层架构；本组件额外创建 WeekPanelController
   * （事件段索引 + EventRevealParticipant + 滚动记忆），并在挂载 effect 内
   * 向门面注册/注销。
   */
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { getAppServices } from "$lib/app/context.svelte";

  import { NOT_WORK_HOUR_RANGES } from "./segment_layout/config";
  import { WeekSkeletonController } from "./skeleton/WeekSkeletonController.svelte";
  import { WeekController } from "./WeekController.svelte";
  import { WeekPanelController } from "./WeekPanelController.svelte";

  import WeekSkeleton from "./skeleton/WeekSkeleton.svelte";
  import NowIndicator from "./skeleton/now_indicator/NowIndicator.svelte";
  import DayHeader from "./skeleton/DayHeader.svelte";
  import DayGrid from "./skeleton/DayGrid.svelte";
  import DragPreview from "./event/DragPreview.svelte";
  import EventSegment from "./event/EventSegment.svelte";
  import type { Store } from "$lib/document/entities/store.svelte";

  interface Props {
    store: Store;
    dayNum?: number;
  }

  let { store, dayNum }: Props = $props();

  const services = getAppServices();
  const skeleton = new WeekSkeletonController(dayNum);
  const weekPanel = new WeekPanelController();
  const controller = new WeekController(
    store,
    skeleton,
    weekPanel.scrollMemory,
  );

  $effect(() => {
    controller.onReady();
    return () => controller.destroy();
  });

  $effect(() => {
    services.facade.registerEventParticipant(weekPanel);
    return () => {
      services.facade.unregisterEventParticipant(weekPanel);
      weekPanel.destroy();
    };
  });
</script>

<ScrollArea
  bind:ref={controller.scrollAreaRef}
  class=" h-full w-full rounded-lg"
  scrollbarYClasses="hidden"
  orientation="both"
>
  <WeekSkeleton {skeleton}>
    <NowIndicator {skeleton} nowPercentage={controller.nowPercentage} />

    <DayHeader {skeleton} />

    <DayGrid
      {skeleton}
      notWorkHourRange={NOT_WORK_HOUR_RANGES}
      drag={services.drag}
      onDragOver={controller.handleDragOver.bind(controller)}
      onDrop={controller.handleDrop.bind(controller)}
      onDragEnd={controller.handleDragEnd.bind(controller)}
    />

    {#each controller.positionedSegments as seg (seg.eventId + "-" + seg.dayIndex)}
      <EventSegment
        {skeleton}
        segment={seg}
        task={seg.event.task!}
        snapsOffset={controller.snapsOffset}
        {weekPanel}
      />
    {/each}

    <DragPreview {skeleton} draggingTaskEvent={controller.draggingTaskEvent} />
  </WeekSkeleton>
</ScrollArea>
