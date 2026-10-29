<!-- 接线场景：条目实例树 + Registry 探针，用于观察登记/注销与根变化。 -->
<script lang="ts">
  import type { Task } from "$lib/document/entities/task.svelte";
  import type { Panel } from "$lib/view/panel.svelte";
  import HarnessTree from "./HarnessTree.svelte";
  import RegistryProbe from "./RegistryProbe.svelte";

  let { panel, task }: { panel: Panel; task: Task } = $props();
</script>

<RegistryProbe {panel} homeId={task.id} />
<HarnessTree {panel} {task} />
