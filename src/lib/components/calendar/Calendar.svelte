<script lang="ts">
	import type { Store } from "$lib/states/meta/store.svelte";
	import Week from "./views/Week.svelte";

	let { store }: { store: Store } =
		$props();
</script>

<div class="flex h-full flex-col justify-stretch" style="contain: content">
	<div class=" grow overflow-y-auto">
		<Week {store}></Week>
	</div>
</div>

<style>
</style>
