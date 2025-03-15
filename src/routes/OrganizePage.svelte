<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Editor from "$lib/panels/todo/Editor.svelte";
	import Schedule from "$lib/panels/schedule/Schedule.svelte";
	import { db } from "@/state";
	let props = $props();

	let rootTask = db.userManager.rootTask;
	let panelStateMap = db.doc.getMap("panelStates");
	let journalProxyManager = db.journalProxyManager;
</script>

<PaneGroup direction="horizontal" class="rounded-lg">
	<Pane>
		<Schedule {journalProxyManager} {panelStateMap} />
	</Pane>
	<PaneResizer />
	<Pane>
		<Editor {rootTask} {panelStateMap} />
	</Pane>
</PaneGroup>
