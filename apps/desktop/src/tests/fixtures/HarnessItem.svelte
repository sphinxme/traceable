<!-- 递归条目部件：构造子条目实例并绑定 self / title part。 -->
<script lang="ts">
  import type { Task } from "$lib/document/entities/task.svelte";
  import type { Panel } from "$lib/view/panel.svelte";
  import type { ViewHandle } from "$lib/view/view-handle.svelte";
  import { ViewHandle as Handle } from "$lib/view/view-handle.svelte";
  import HarnessList from "./HarnessList.svelte";

  let {
    panel,
    parent,
    task,
  }: { panel: Panel; parent: ViewHandle; task: Task } = $props();

  const handle = new Handle(panel, task, parent);
  let selfEl: HTMLDivElement;
  let titleEl: HTMLDivElement;

  $effect(() => {
    panel.registry.register(handle);
    handle.bindPart("self", selfEl);
    handle.bindPart("title", titleEl);
    return () => {
      handle.unbindPart("title");
      handle.unbindPart("self");
      panel.registry.unregister(handle);
    };
  });
</script>

<div
  bind:this={selfEl}
  data-part="self"
  data-item={task.id}
  data-parent={parent.task.id}
  data-hid={handle.hid}
>
  <div bind:this={titleEl} data-part="title">{task.$text}</div>
  {#if !handle.folded}
    <HarnessList {panel} parent={handle} {task} />
  {/if}
</div>
