<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import Editor from "$lib/panels/todo/Editor.svelte";
	import { db } from "@/state";

	let rootTask = db.userManager.rootTask;
	let panelStateMap = db.doc.getMap("panelStates");
	let eventProxyManager = db.eventProxyManager;
</script>

<PaneGroup direction="horizontal" class=" gap-1.5 p-3">
	<Pane
		style="transition-property: box-shadow, border;"
		class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
	>
		<Calendar {eventProxyManager} />
	</Pane>
	<PaneResizer />
	<Pane
		style="transition-property: box-shadow, border;"
		class="rounded-lg shadow-lg transition-shadow duration-300 focus-within:shadow-2xl focus-within:ring-indigo-500"
	>
		<Editor
			panelId="root"
			allPanelStateMap={panelStateMap}
			rootTaskId={rootTask.id}
		/>
	</Pane>
</PaneGroup>
