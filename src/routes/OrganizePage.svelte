<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Editor from "$lib/panels/todo/Editor.svelte";
	import { db } from "@/state";
	import Weekly from "$lib/panels/journal/Weekly.svelte";
	import { type StateMap } from "$lib/states/states/panel_states";
	import * as Y from "yjs";
	let props = $props();

	let rootTask = db.userManager.rootTask;
	let panelStateMap = db.doc.getMap("panelStates") as Y.Map<StateMap>;
	let journalProxyManager = db.journalProxyManager;
</script>

<PaneGroup direction="horizontal" class=" gap-1.5 p-3">
	<Pane
		style="transition-property: box-shadow, border;"
		class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
	>
		<Weekly
			panelId="weekly"
			{journalProxyManager}
			allPanelStates={panelStateMap}
		/>
	</Pane>
	<PaneResizer />
	<Pane
		style="transition-property: box-shadow, border;"
		class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
	>
		<Editor
			panelId="root"
			rootTaskId={rootTask.id}
			allPanelStateMap={panelStateMap}
		/>
	</Pane>
</PaneGroup>
