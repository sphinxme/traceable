<script lang="ts">
  /**
   * Todo — 单个大纲条目（递归渲染）。
   *
   * 子条目实例在 script 顶层纯分配；登记/接线/注销收口于同一个 `$effect`（W1/G6）。
   * ghost 为纯派生（不遍历条目实例）：源出现与同 taskId 的其他出现自动响应拖拽会话。
   */
  import CollapseIcon from "./item/overlay/CollapseButton.svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import Handle from "./item/overlay/Handle.svelte";
  import TodoItem from "./item/TodoItem.svelte";
  import TodoList from "./TodoList.svelte";
  import { ViewHandle } from "$lib/view/view-handle.svelte";
  import type { Task } from "$lib/document/entities/task.svelte";
  import { getAppServices } from "$lib/app/context.svelte";
  import { remove } from "$lib/components/adapters/actions";

  interface Props {
    parent: ViewHandle;
    task: Task;
    onZoom?: (handle: ViewHandle) => void;
  }

  let { parent, task, onZoom }: Props = $props();

  const ds = getAppServices().drag;
  const handle = new ViewHandle(parent.panel, task, parent);
  let rootEl: HTMLDivElement;
  let highlighting = $state(false);

  const ghost = $derived(ds.active && ds.payload?.task.id === task.id);
  const hasChildren = $derived(task.children.size > 0);

  $effect(() => {
    parent.panel.registry.register(handle);
    handle.bindPart("self", rootEl);
    handle.scrollIntoView = () =>
      rootEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => {
      handle.scrollIntoView = () => {};
      handle.unbindPart("self");
      parent.panel.registry.unregister(handle);
    };
  });

  $effect(() => {
    const until = handle.highlightUntil;
    if (until === null) {
      highlighting = false;
      return;
    }
    highlighting = true;
    const timer = setTimeout(
      () => {
        handle.highlightUntil = null;
        highlighting = false;
      },
      Math.max(0, until - Date.now()),
    );
    return () => clearTimeout(timer);
  });
</script>

<div
  bind:this={rootEl}
  class="traceable-highlight relative flex flex-col"
  class:is-highlighting={highlighting}
  class:opacity-35={ghost}
>
  <TodoItem {handle}>
    {#snippet handleSlot()}
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Handle {handle} onZoom={() => onZoom?.(handle)} />
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item
            class="text-red-500"
            onclick={() => remove(parent.panel, handle)}
          >
            删除
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    {/snippet}

    {#snippet overlay()}
      {#if hasChildren && !ghost}
        <CollapseIcon {handle} />
      {/if}
    {/snippet}
  </TodoItem>

  <TodoList {handle} {onZoom}>
    {#snippet side()}
      <div
        class=" {task.$note.length > 0
          ? ' -mt-8'
          : ''} group flex w-5 shrink-0 flex-row items-start pb-0 pl-1"
      >
        <div
          class=" h-full bg-zinc-100 transition-colors duration-300 group-hover:bg-zinc-300"
          style="width: 1px;"
        ></div>
      </div>
    {/snippet}
  </TodoList>

  {#if ghost}
    <!-- dragging mask -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      style:pointer-events="none"
      class=" dragging absolute z-50 -ml-2 h-full w-full rounded-md bg-zinc-500 opacity-0 transition duration-100"
    ></div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scaleX(0);
    }
    to {
      opacity: 0.3;
      transform: scaleX(1);
    }
  }
  .dragging {
    opacity: 0;
    transform: scaleX(0);
    transform-origin: top left;
    animation: fadeIn 150ms ease-out forwards;
  }
</style>
