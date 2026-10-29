<!-- HarnessTree 的递归列表部件：只做 part 绑定与 keyed 渲染。 -->
<script lang="ts">
  import type { Task } from "$lib/document/entities/task.svelte";
  import type { Panel } from "$lib/view/panel.svelte";
  import type { ViewHandle } from "$lib/view/view-handle.svelte";
  import HarnessItem from "./HarnessItem.svelte";

  let {
    panel,
    parent,
    task,
  }: { panel: Panel; parent: ViewHandle; task: Task } = $props();

  let listEl: HTMLDivElement;

  $effect(() => {
    parent.bindPart("list", listEl);
    return () => parent.unbindPart("list");
  });

  const children = $derived(task.children.toArray());
</script>

<div bind:this={listEl} data-part="list" data-list-of={task.id}>
  {#each children as child (child.id)}
    <HarnessItem {panel} {parent} task={child} />
  {/each}
</div>
