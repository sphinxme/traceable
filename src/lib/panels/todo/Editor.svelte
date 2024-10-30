<script lang="ts">
	import { setContext } from 'svelte';
	import { Skull, BatteryFull } from 'lucide-svelte';
	import TodoView from '$lib/views/TodoView.svelte';
	import Navigator from './Navigator.svelte';
	import type { TaskProxy } from '$lib/states/rxdb';
	import type { Observable } from 'rxjs';

	export let rootTask: Observable<TaskProxy>;
	let paths: Observable<TaskProxy>[] = [rootTask];
	$: currentPageTask = paths.at(-1) || rootTask;
	$: console.log({ c: paths.at(-1) || rootTask });
	const pushPaths = (subpaths: Observable<TaskProxy>[]) => {
		paths = [...paths, ...subpaths];
	};

	setContext('panelId', 'root');
	setContext('paths', {
		push: pushPaths
	});
</script>

<div
	data-tauri-drag-region
	class="flex h-full grow flex-col overflow-auto rounded bg-background p-4 shadow-xl"
>
	<!-- header -->
	<div data-tauri-drag-region class="flex flex-row">
		<Navigator bind:paths />
		<div data-tauri-drag-region class="flex flex-grow items-center justify-center">---</div>
		<div data-tauri-drag-region class="flex flex-row">
			<BatteryFull />
			<Skull />
		</div>
	</div>
	<TodoView task={currentPageTask} />
</div>
