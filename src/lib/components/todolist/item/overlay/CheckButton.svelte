<script lang="ts">
	import { Circle, CircleCheckBig } from 'lucide-svelte';

	export let isCompleted: boolean;
	export let size = 20;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="cursor-pointer" on:click>
	{#if isCompleted}
		<CircleCheckBig {size} />
	{:else}
		<Circle {size} />
	{/if}
</div>
