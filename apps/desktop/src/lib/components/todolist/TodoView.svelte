<script lang="ts">
  /**
   * TodoView — 视图入口组件（面板根）。
   *
   * 每个 home 一个根条目实例（script 顶层纯分配）；登记/接线/注销收口于同一个
   * `$effect`（W1/G6）。导航变更 home 时由调用方以 homeTask.id keyed 整树重建（W3）。
   */
  import TodoList from "./TodoList.svelte";
  import Title from "./item/Title.svelte";
  import { CirclePlus } from "@lucide/svelte";
  import { ViewHandle } from "$lib/view/view-handle.svelte";
  import { addChild } from "$lib/components/adapters/actions";
  import type { Panel } from "$lib/view/panel.svelte";
  import type { Task } from "$lib/document/entities/task.svelte";

  interface Props {
    panel: Panel;
    homeTask: Task;
    showTitle?: boolean;
    highlightTitle?: boolean;
    onZoom?: (handle: ViewHandle) => void;
  }

  let {
    panel,
    homeTask,
    showTitle = true,
    highlightTitle,
    onZoom,
  }: Props = $props();

  const handle = new ViewHandle(panel, homeTask);
  let selfEl: HTMLDivElement;
  let highlighting = $state(false);

  $effect(() => {
    panel.registry.register(handle);
    handle.bindPart("self", selfEl);
    handle.scrollIntoView = () =>
      selfEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => {
      handle.scrollIntoView = () => {};
      handle.unbindPart("self");
      panel.registry.unregister(handle);
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
  bind:this={selfEl}
  class="todoview traceable-highlight flex grow flex-col"
  class:is-highlighting={highlighting}
>
  {#if showTitle}
    <Title {handle} {highlightTitle} />
  {/if}

  <div class="pl-4">
    <TodoList {handle} alwaysDisplay {onZoom} />
  </div>

  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="button"
    class="flex w-full flex-row rounded-lg p-1 pl-3 opacity-20 transition-colors duration-300 hover:bg-zinc-300"
    onclick={() => addChild(panel, handle)}
  >
    <CirclePlus size={16} />
  </div>
</div>
