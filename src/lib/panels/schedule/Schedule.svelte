<script lang="ts">
	import Weekly from "./Weekly.svelte";

	let props = $props();
</script>

<div class="flex h-full grow flex-col rounded bg-background p-4 pr-0 shadow-xl">
	<Weekly></Weekly>
</div>
