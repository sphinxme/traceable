<script lang="ts">
	import { setContext } from 'svelte';
	import { Skull, BatteryFull } from 'lucide-svelte';
	import TodoView from '$lib/views/TodoView.svelte';
	import Navigator from './Navigator.svelte';

	export let rootId;

	let paths = [rootId];
	$: currentPageId = paths.at(-1);
	const pushPaths = (subpaths: string[]) => {
		paths = [...paths, ...subpaths];
	};

	setContext('panelId', 'root');
	setContext('paths', {
		push: pushPaths
	});
</script>

<div class="flex h-full grow flex-col overflow-auto rounded bg-background p-4 shadow-xl">
	<!-- header -->
	<div class="flex flex-row">
		<Navigator bind:paths />
		<div class="flex flex-grow items-center justify-center">---</div>
		<div class="flex flex-row">
			<BatteryFull />
			<Skull />
		</div>
	</div>
	<TodoView rootId={currentPageId} />
</div>
