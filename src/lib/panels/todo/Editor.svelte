<script lang="ts">
	import * as Y from "yjs";
	import { onDestroy, setContext } from "svelte";
	import { Skull, BatteryFull } from "lucide-svelte";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import Navigator from "./Navigator.svelte";
	import { loadEditorPanelState } from "./state.svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";
	import { highlightTaskSignal } from "$lib/states/signals.svelte";
	import { initRegister } from "./context.svelte";

	interface Props {
		rootTask: TaskProxy;
		panelStateMap: Y.Map<any>; // panelId-PanelStates
	}

	let { rootTask, panelStateMap }: Props = $props();
	let todoView: TodoView; // bind
	const panelId = "root";
	setContext("panelId", panelId);
	const registerMap = initRegister();
	const panelState = loadEditorPanelState(panelId, panelStateMap, rootTask);
	let rootItemState = panelState.rootState$;
	let currentTask = $derived($rootItemState.task);

	// focus
	$effect(() => {
		const subscriber = highlightTaskSignal.subscribe(({ id, index }) => {
			const todoStateList = registerMap.get(id);
			if (!todoStateList || !todoStateList.length) {
				return;
			}

			index = index % todoStateList.length;
			const state = todoStateList?.at(index);
			const paths = state?.relativePath;
			console.log({ todoStateList, state, index, paths });
			if (paths) {
				todoView.foucsByLocation([...paths], 0, true);
			}
		});
		return () => {
			subscriber.unsubscribe();
		};
	});
</script>

<div
	data-tauri-drag-region
	class="flex h-full grow flex-col overflow-auto rounded bg-background py-4 pt-3 shadow-xl pl-0.5"
>
	<!-- header -->
	<div data-tauri-drag-region class="flex flex-row px-1">
		<Navigator
			{panelState}
			onPopPaths={() => {
				todoView.setRootTodoListViewTransitionName(
					"pre-root-todo-list",
				);
				todoView.setTitleViewTransitionName("pre-title");
				return () => {
					todoView.setRootTodoListViewTransitionName("");
					todoView.setTitleViewTransitionName("");
				};
			}}
		/>
	</div>
	<div class="px-3">
		<TodoView
			bind:this={todoView}
			showTitle={!$rootItemState.isRoot}
			task={currentTask}
			{rootItemState}
		/>
	</div>
</div>
