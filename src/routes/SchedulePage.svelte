<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import Schedule from "$lib/panels/schedule/Schedule.svelte";
	import { db } from "@/state";
	let props = $props();

	let eventProxyManager = db.eventProxyManager;
	let panelStateMap = db.doc.getMap("panelStates");
	let journalProxyManager = db.journalProxyManager;
</script>

<PaneGroup direction="horizontal">
	<Pane>
		<Calendar {eventProxyManager} />
	</Pane>
	<PaneResizer />
	<Pane>
		<Schedule {journalProxyManager} {panelStateMap} />
	</Pane>
</PaneGroup>
