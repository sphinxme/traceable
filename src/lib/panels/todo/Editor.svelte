<script lang="ts">
	import * as Y from "yjs";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import Navigator from "./Navigator.svelte";

	import { db } from "@/state";
	import { EditorPanelController } from "$lib/panels/PanelController.svelte";
	import { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
	import { ScrollArea } from "$lib/components/ui/scroll-area";

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
		db.store,
	);
	let scrollAreaRef = $state<HTMLElement>(null as any);

	$effect(() => {
		controller.scrollTo = (top, left) => {
			scrollAreaRef.scrollTo({ top, left, behavior: "instant" });
		};
		scrollAreaRef.addEventListener("scroll", () => {
			controller.onScroll(
				scrollAreaRef.scrollTop,
				scrollAreaRef.scrollLeft,
			);
		});
		controller.onTodoReady();
		return () => {
			controller.destroy();
		};
	});
</script>

<svelte:window onbeforeunload={() => controller.destroy()} />
<ScrollArea
	data-tauri-drag-region
	class="flex h-full grow flex-col overflow-auto rounded-lg bg-background py-4 pt-2 pl-4"
	bind:ref={scrollAreaRef}
>
	<!-- header -->
	<div data-tauri-drag-region class="flex flex-row px-0.5 py-2">
		<Navigator {controller} />
	</div>
	<div class="px-3">
	<TodoView
		showTitle={!controller.isRootHome}
		controller={controller.currentHomeController}
	/>
	</div>
</ScrollArea>
