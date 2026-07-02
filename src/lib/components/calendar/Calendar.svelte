<script lang="ts">
	/**
	 * 日历组件入口。
	 *
	 * 接收 Store，根据 view 属性渲染对应视图（目前仅周视图）。
	 * 周视图采用 Skeleton-Controller-Svelte 三层架构，
	 * 详见 `week/Week.svelte` 顶部 JSDoc。
	 */
	import type { Store } from "$lib/states/meta/store.svelte";
	import Week from "./week/Week.svelte";

	let { store, view = "week" }: { store: Store; view?: "week" | "month" } =
		$props();
</script>

<div class="flex h-full flex-col justify-stretch" style="contain: content">
	<div class=" grow overflow-y-auto">
		{#if view === "week"}
			<Week {store} />
		{:else if view === "month"}
			<!-- TODO: <Month {store} /> -->
		{/if}
	</div>
</div>

<style>
</style>
