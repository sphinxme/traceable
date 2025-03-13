<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import Editor from "$lib/panels/todo/Editor.svelte";
	import { db } from "@/state";

	let rootTask = db.userManager.rootTask;
	let panelStateMap = db.doc.getMap("panelStates");
	let eventProxyManager = db.eventProxyManager;
</script>

<PaneGroup direction="horizontal">
	<Pane>
		<Calendar {eventProxyManager} />
	</Pane>
	<PaneResizer />
	<Pane>
		<Editor {rootTask} {panelStateMap} />
	</Pane>
</PaneGroup>
