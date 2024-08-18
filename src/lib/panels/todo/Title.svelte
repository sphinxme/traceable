<script lang="ts">
	import { getContext } from 'svelte';
	import { quill } from './quill';
	import type { Database } from '$lib/states/data';
	const db: Database = getContext('db');
	export let taskId: string;
</script>

<h1
	class="traceable-quill-title scroll-m-20 py-4 text-3xl font-bold tracking-tight transition-colors first:mt-0"
>
	<div use:quill={{ taskId, db }} />
</h1>

<style>
	:global(.traceable-quill-title .ql-container) {
		font-size: xx-large;
		/* display: flex; */

		/* flex-grow: 1; */
		/* padding-bottom: 2px; */
	}
</style>
