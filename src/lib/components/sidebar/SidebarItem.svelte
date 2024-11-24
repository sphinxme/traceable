<script lang="ts">
	import { location, push } from "svelte-spa-router";
	let { children, path }: { children: any; path: string } = $props();
</script>

<button
	onclick={() => {
		push(path);
	}}
	class="m-1 rounded-lg p-2 px-4 text-center text-lg transition-colors duration-300 hover:bg-slate-200"
	class:bg-slate-200={$location == path}
>
	{@render children?.()}
</button>
