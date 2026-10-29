<!-- 真实 EditorPanel 宿主：按 currentHomeId keyed，home 变更整树重建（W3）。 -->
<script lang="ts">
  import type { EditorPanel } from "$lib/view/panel.svelte";
  import HarnessTree from "./HarnessTree.svelte";

  let { panel }: { panel: EditorPanel } = $props();
</script>

{#key panel.currentHomeId}
  <HarnessTree {panel} task={panel.navTaskList.at(-1)!} />
{/key}
