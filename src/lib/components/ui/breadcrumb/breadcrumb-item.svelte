<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLLiAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";
	import { fade, fly } from "svelte/transition";

	let {
		ref = $bindable(null),
		class: className,
		children,
		index,
		...restProps
	}: WithElementRef<HTMLLiAttributes> & { index?: number } = $props();
</script>

<li
	bind:this={ref}
	class={cn("inline-flex items-center gap-1.5", className)}
	{...restProps}
>
	{@render children?.()}
</li>
