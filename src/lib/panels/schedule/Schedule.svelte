<script lang="ts">
	import Weekly from "./Weekly.svelte";

	let props = $props();
</script>

<div class="flex h-full grow flex-col rounded bg-background pr-0 shadow-xl">
	<Weekly></Weekly>
</div>
