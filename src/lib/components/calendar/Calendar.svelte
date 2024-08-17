<script lang="ts">
	import { db } from '$lib/states/data';
	import Week from './views/Week.svelte';

	export let rootId: string = 'root';
</script>

<div class="flex h-full flex-col justify-stretch">
	<div class=" grow overflow-y-auto">
		<Week {db} {rootId}></Week>
	</div>
</div>

<style>
</style>
