<script lang="ts">
  /**
   * TaskDropable — 拖放目标放置槽。
   *
   * 不持业务逻辑：事件直转 DnDAdapter；指示条 = `onDragOver` 结果的纯投影
   * （dragenter/dragover 都算、dragleave 清、dragend 经 `{#if ds.active}` 卸载兜底）。
   */
  import type { ViewHandle } from "$lib/view/view-handle.svelte";
  import { getAppServices } from "$lib/app/context.svelte";

  interface Props {
    parentHandle: ViewHandle;
    index: number;
  }

  let { parentHandle, index }: Props = $props();

  const { dndAdapter: dnd, drag: ds, keyboard } = getAppServices();
  const slot = $derived({ parentHandle, index });

  let hovering = $state(false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class=" transition-height relative w-full duration-300 {hovering
    ? 'h-2'
    : 'h-0'}"
>
  <!-- 拖拽检测区域(超出上方的relative范围) -->
  {#if ds.active}
    <div
      class:hovering
      class=" absolute -bottom-1.5 -top-3 flex w-full flex-col items-center justify-center"
      ondragenter={(event) => {
        event.preventDefault();
        hovering = dnd.onDragOver(slot, keyboard.metaKey) !== "none";
      }}
      ondragover={(event) => {
        event.preventDefault();
        const effect = dnd.onDragOver(slot, keyboard.metaKey);
        if (event.dataTransfer) event.dataTransfer.dropEffect = effect;
        hovering = effect !== "none";
      }}
      ondragleave={() => (hovering = false)}
      ondrop={(event) => {
        event.preventDefault();
        hovering = false;
        dnd.onDrop(slot, keyboard.metaKey);
      }}
      style:z-index={parentHandle.depth}
    ></div>
  {/if}
</div>

<style>
  /* 指示器 */
  .hovering::after {
    position: absolute;
    content: "";
    height: 4px;
    width: 100%;
    right: 4px;
    border-radius: 0.5rem;
    background-color: gray;
    opacity: 20%;
  }
</style>
