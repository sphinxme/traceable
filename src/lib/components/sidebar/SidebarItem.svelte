<script lang="ts">
	import { location } from "svelte-spa-router";
	let {
		children,
		path,
		href,
	}: { children: any; path: string; href: string } = $props();
</script>

<a
	{href}
	class="m-1 rounded-lg p-2 px-4 text-center text-lg transition-colors duration-300 hover:bg-slate-200"
	class:bg-slate-200={$location == path}
>
	{@render children?.()}
</a>
