<script lang="ts">
  /**
   * CollapseButton — 折叠/展开按钮（G3 唯一 UI 写点）。
   *
   * 读写一律经 `handle.folded` 通道（FoldTree 唯一权威）；显示逻辑：
   * 折叠时始终可见并旋转 -90°；展开时仅 group hover 显示。
   */
  import { ChevronDown } from "@lucide/svelte";
  import type { ViewHandle } from "$lib/view/view-handle.svelte";

  interface Props {
    handle: ViewHandle;
  }

  let { handle }: Props = $props();

  const displayClass = (folded: boolean) =>
    folded ? "opacity-100" : "group-hover:opacity-50 opacity-0";
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  onclick={() => (handle.folded = !handle.folded)}
  class={`${displayClass(handle.folded)} cursor-pointer bg-white transition-all duration-300 ease-out ${
    handle.folded ? "-rotate-90" : ""
  }`}
>
  <ChevronDown size={16} strokeWidth={3} />
</div>
