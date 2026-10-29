<!-- 环境探针用的最小 Svelte 组件：证明挂载与 Yjs 响应式可工作。 -->
<script lang="ts">
  import type { Task } from "$lib/document/entities/task.svelte";

  let { label, task }: { label: string; task?: Task } = $props();
</script>

<div data-testid="smoke">
  <span data-testid="label">{label}</span>
  {#if task}
    <span data-testid="task-text">{task.$text}</span>
  {/if}
</div>
