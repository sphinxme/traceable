<script lang="ts">
	import { Circle, CircleCheckBig } from "@lucide/svelte";
	import type { MouseEventHandler } from "svelte/elements";

	interface Props {
		isCompleted: boolean;
		size?: number;
		onclick: MouseEventHandler<HTMLDivElement>;
	}

	let { isCompleted, size = 20, onclick }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="cursor-pointer" {onclick}>
	{#if isCompleted}
		<CircleCheckBig {size} />
	{:else}
		<Circle {size} />
	{/if}
</div>
