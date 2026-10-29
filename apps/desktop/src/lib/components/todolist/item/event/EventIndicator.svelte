<script lang="ts">
  /**
   * EventIndicator — 日历事件指示条。
   *
   * hover → facade.highlightEvent（周历高亮进/出对称）；click → facade.revealEvent。
   */
  import * as HoverCard from "$lib/components/ui/hover-card";
  import type { Event } from "$lib/document/entities/event.svelte";
  import { getAppServices } from "$lib/app/context.svelte";
  import dayjs from "dayjs";

  interface Props {
    event: Event;
    isCompleted: boolean;
  }

  let { event, isCompleted }: Props = $props();

  const facade = getAppServices().facade;

  let length = $derived((event.end - event.start) / (1000 * 60 * 2)); // 10分钟5px

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
      facade.highlightEvent(event.id, open);
    }}
  >
    <HoverCard.Trigger
      onclick={() => {
        facade.revealEvent(event.id);
      }}
    >
      <div
        class=" indicator h-1 w-full cursor-pointer rounded-full bg-zinc-600 opacity-70 transition-all duration-100 {isCompleted
          ? 'opacity-30'
          : ''}"
      ></div>
    </HoverCard.Trigger>
    <HoverCard.Content side="top" sideOffset={24}>
      <div class=" text-sm font-semibold">
        {dayjs(event.start).format("YYYY-MM-DD")}
      </div>
      <div class=" text-xs font-semibold">
        {dayjs(event.start).format("HH:mm")} -
        {dayjs(event.end).format("HH:mm")}
      </div>
      <div>{formatDuration(event.end - event.start)}</div>
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
