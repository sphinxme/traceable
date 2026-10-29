<!-- 只读探针：把 Registry 的当前根与根数量投影到 DOM，供断言读取。 -->
<script lang="ts">
  import type { Panel } from "$lib/view/panel.svelte";

  let { panel, homeId }: { panel: Panel; homeId: string } = $props();

  const current = $derived(panel.registry.root(homeId));
  const roots = $derived(panel.registry.roots());
</script>

<span data-testid="current-hid">{current ? current.hid : "none"}</span>
<span data-testid="root-count">{roots.length}</span>
