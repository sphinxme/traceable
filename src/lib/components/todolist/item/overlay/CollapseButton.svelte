<script>
	import { ChevronDown } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	const emit = createEventDispatcher();
	export let folded = false;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	on:click={() => {
		folded = !folded;
		if (folded) {
			emit('folded');
		} else {
			emit('unfolded');
		}
	}}
	class={`${folded ? 'opacity-100' : 'opacity-50'} transition-opacity duration-300 ease-out hover:opacity-100 ${folded ? '-rotate-90' : ''}`}
>
	<ChevronDown size={16} strokeWidth={3} />
</div>
