<script lang="ts">
	import * as Y from "yjs";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import Navigator from "./Navigator.svelte";

	import { db } from "@/state";
	import { EditorPanelController } from "$lib/panels/PanelController.svelte";
	import { PanelStateStore } from "$lib/states/states/StatesTree.svelte";

	interface Props {
		panelId: string;
		allPanelStateMap: Y.Map<any>; // panelId-PanelStates
		rootTaskId: string;
	}

	let { panelId, allPanelStateMap, rootTaskId }: Props = $props();
	const panelStates = PanelStateStore.getOrCreateFromParentYMap(
		allPanelStateMap,
		panelId,
		rootTaskId,
	);

	const controller = new EditorPanelController(
		panelId,
		panelStates,
		rootTaskId,
		db.taskProxyManaager,
	);

	$effect(() => {
		controller.onTodoReady();
		return () => {
			controller.destory();
		};
	});
</script>

<svelte:window onbeforeunload={() => controller.destory()} />
<div
	data-tauri-drag-region
	class="flex h-full grow flex-col overflow-auto rounded-lg bg-background py-4 pt-2 pl-4"
>
	<!-- header -->
	<div data-tauri-drag-region class="flex flex-row px-0.5 py-2">
		<Navigator {controller} />
	</div>
	<div class="px-3">
		<TodoView
			showTitle={!controller.$isRootHome}
			controller={controller.$currentHomeController}
		/>
	</div>
</div>
