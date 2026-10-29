<!-- 接线样板：单 home 的最小条目实例树，按 W1–W4 收口登记/接线/注销。 -->
<script lang="ts">
  import type { Task } from "$lib/document/entities/task.svelte";
  import type { Panel } from "$lib/view/panel.svelte";
  import { ViewHandle } from "$lib/view/view-handle.svelte";
  import HarnessList from "./HarnessList.svelte";

  let { panel, task }: { panel: Panel; task: Task } = $props();

  const handle = new ViewHandle(panel, task);
  let selfEl: HTMLDivElement;
  let titleEl: HTMLHeadingElement;

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
  data-root={task.id}
  data-hid={handle.hid}
>
  <h1 bind:this={titleEl} data-part="title">{task.$text}</h1>
  {#if !handle.folded}
    <HarnessList {panel} parent={handle} {task} />
  {/if}
</div>
