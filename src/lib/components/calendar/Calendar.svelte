<script lang="ts">
	import type { EventProxyManager } from "$lib/states/meta/event.svelte";
	import Week from "./views/Week.svelte";

	let { eventProxyManager }: { eventProxyManager: EventProxyManager } =
		$props();
</script>

<div class="flex h-full flex-col justify-stretch">
	<div class=" grow overflow-y-auto">
		<Week manager={eventProxyManager}></Week>
	</div>
</div>

<style>
</style>
