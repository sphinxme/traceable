<script lang="ts">
  /**
   * TodoList — 子列表容器（root 与 item 统一由本组件绑定 `list` part，W2）。
   *
   * 显示控制：`alwaysDisplay`（root）或 `!handle.folded`（item）。
   */
  import type { Snippet } from "svelte";
  import { slide } from "svelte/transition";

  import Todo from "./Todo.svelte";
  import TaskDropable from "./dnd/TaskDropable.svelte";

  import type { ViewHandle } from "$lib/view/view-handle.svelte";

  interface Props {
    handle: ViewHandle;
    side?: Snippet;
    alwaysDisplay?: boolean;
    onZoom?: (handle: ViewHandle) => void;
  }

  let { handle, side, alwaysDisplay = false, onZoom }: Props = $props();

  let listEl = $state<HTMLDivElement | null>(null);

  const children = $derived(handle.task.children.toArray());

  $effect(() => {
    const el = listEl;
    if (!el) return;
    handle.bindPart("list", el);
    return () => handle.unbindPart("list");
  });
</script>

{#if alwaysDisplay || !handle.folded}
  <div bind:this={listEl} transition:slide class="flex w-full flex-row">
    {@render side?.()}

    <div class="relative w-full" role="list">
      {#each children as child, i (child.id)}
        <div>
          <TaskDropable parentHandle={handle} index={i} />

          <Todo parent={handle} task={child} {onZoom} />
        </div>
      {/each}

      <TaskDropable parentHandle={handle} index={children.length} />
    </div>
  </div>
{/if}
