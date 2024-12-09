<script lang="ts">
	import * as Y from "yjs";
	import { getContext, setContext } from "svelte";
	import { Skull, BatteryFull } from "lucide-svelte";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import Navigator from "./Navigator.svelte";
	import type { Database, TaskProxy } from "$lib/states/rxdb";
	import type { Observable } from "rxjs";
	import type { StateMap } from "$lib/states/rxdb/rxdb";
	import type { PathItem } from "$lib/states/stores.svelte";

	interface Props {
		rootTask: Observable<TaskProxy>;
	}
	const db = getContext<Database>("db");

	let { rootTask }: Props = $props();
	let paths: PathItem[] = $state([{ id: $rootTask.id, proxy: rootTask }]);
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
	class="flex h-full grow flex-col overflow-auto rounded bg-background p-4 pt-0 shadow-xl"
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
	<TodoView stateMap={getCurrentStateMap()} task={currentPageTask} />
</div>
