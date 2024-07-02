<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { setContext } from 'svelte';
	import Weekly from './Weekly.svelte';

	setContext('panelId', 'weekly');
</script>

<div class="flex h-full grow flex-col rounded bg-background p-4 pr-0 shadow-xl">
	<Weekly></Weekly>
</div>
