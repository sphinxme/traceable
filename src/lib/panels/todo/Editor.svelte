<script lang="ts">
	import * as Y from "yjs";
	import { getContext, onDestroy, setContext } from "svelte";
	import { Skull, BatteryFull } from "lucide-svelte";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import Navigator from "./Navigator.svelte";
	import type { Database, TaskProxy } from "$lib/states/rxdb";
	import type { Observable } from "rxjs";
	import type { StateMap } from "$lib/states/rxdb/rxdb";
	import type { PathItem } from "$lib/states/stores.svelte";
	import { getPrePaths, storePaths } from "./state.svelte";

	interface Props {
		rootTask: Observable<TaskProxy>;
	}
	const db = getContext<Database>("db");

	let { rootTask }: Props = $props();
	let paths: PathItem[] = $state(getPrePaths());
	// svelte-ignore state_referenced_locally
	if (paths.length == 0) {
		paths = [{ id: $rootTask.id, proxy: rootTask }];
	}
	onDestroy(() => {
		storePaths(paths);
	});

	let currentPageTask = $derived(paths.at(-1)?.proxy || rootTask);

	let panelId = "root";
	setContext("panelId", panelId);
	setContext("paths", {
		push: (subpaths: PathItem[]) => paths.push(...subpaths),
	});

	// svelte-ignore non_reactive_update
	let panelState = db.panelStates.get(panelId)!;
	if (!panelState) {
		panelState = new Y.Map();
		db.panelStates.set(panelId, panelState);
	}

	const getCurrentStateMap = () => {
		if (!paths || paths.length == 0) {
			return panelState;
		}
		let stateMap = db.panelStates as StateMap;
		paths.forEach((item) => {
			let stateMap_ = stateMap.get(item.id) as StateMap | undefined;
			if (!stateMap_) {
				stateMap_ = new Y.Map();
				stateMap.set(item.id, stateMap_);
			}
			stateMap = stateMap_;
		});
		return stateMap;
	};
</script>

<div
	data-tauri-drag-region
	class="flex h-full grow flex-col overflow-auto rounded bg-background py-4 pt-0 shadow-xl pl-0.5"
>
	<!-- header -->
	<div data-tauri-drag-region class="flex flex-row px-1">
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
	<div class="px-3">
		<TodoView
			showTitle={paths.length !== 1}
			stateMap={getCurrentStateMap()}
			task={currentPageTask}
		/>
	</div>
</div>
