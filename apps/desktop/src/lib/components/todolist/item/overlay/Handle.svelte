<script lang="ts">
  /**
   * Handle — 拖拽手柄（源手柄）。
   *
   * draggable + dragstart/dragend 直转 DnDAdapter；click 由调用侧注入 zoom
   * （Editor 分支有值、Journal 分支无值——能力由调用侧显式表达）。
   */
  import { colors } from "./colors";
  import type { ViewHandle } from "$lib/view/view-handle.svelte";
  import { getAppServices } from "$lib/app/context.svelte";

  interface Props {
    handle: ViewHandle;
    onZoom?: () => void;
  }

  let { handle, onZoom }: Props = $props();

  const dnd = getAppServices().dndAdapter;
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
  role="button"
  onclick={() => onZoom?.()}
  ondragstart={(event) => dnd.onDragStart(event, handle)}
  ondragend={() => dnd.onDragEnd()}
  draggable="true"
  data-task-id={handle.task.id}
  class="handle relative flex items-center justify-center"
>
  <span
    class=" plate absolute h-5 w-5 rounded-full bg-zinc-300 opacity-0 duration-300 group-hover:opacity-60"
    style:z-index="5"
  >
    <div
      class="extra-panel absolute left-0 flex h-5 w-0 items-stretch justify-stretch overflow-hidden rounded-full bg-zinc-300 transition duration-300 ease-in-out"
      style:z-index="8"
      style:transition-property="width"
    >
      <div class="w-5 shrink-0"></div>
      <div
        class="toggle flex grow items-stretch justify-stretch text-xs font-bold text-zinc-700"
        onclick={(e) => e.stopPropagation()}
      ></div>
    </div>
  </span>
  <span class={` z-10 h-2 w-2 rounded-full ${colors[handle.task.status]}`}
  ></span>
</div>

<style>
  .handle:active .extra-panel {
    width: 0rem;
    height: 0%;
    display: none;
  }
</style>
