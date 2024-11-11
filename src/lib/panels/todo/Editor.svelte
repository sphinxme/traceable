<script lang="ts">
	import { setContext } from "svelte";
	import { Skull, BatteryFull } from "lucide-svelte";
	import TodoView from "$lib/views/TodoView.svelte";
	import Navigator from "./Navigator.svelte";
	import type { TaskProxy } from "$lib/states/rxdb";
	import type { Observable } from "rxjs";

	interface Props {
		rootTask: Observable<TaskProxy>;
	}

	let { rootTask }: Props = $props();
	let paths: Observable<TaskProxy>[] = $state([rootTask]);
	let currentPageTask = $derived(paths.at(-1) || rootTask);

	setContext("panelId", "root");
	setContext("paths", {
		push: (subpaths: Observable<TaskProxy>[]) => paths.push(...subpaths),
	});
</script>

<div
	data-tauri-drag-region
	class="flex h-full grow flex-col overflow-auto rounded bg-background p-4 shadow-xl"
>
	<!-- header -->
	<div data-tauri-drag-region class="flex flex-row">
		<Navigator bind:paths />
		<div
			data-tauri-drag-region
			class="flex flex-grow items-center justify-center"
		>
			---
		</div>
		<div data-tauri-drag-region class="flex flex-row">
			<BatteryFull />
			<Skull />
		</div>
	</div>
	<TodoView task={currentPageTask} />
</div>
