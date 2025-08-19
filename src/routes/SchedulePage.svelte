<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import { db } from "@/state";
	import { type StateMap } from "$lib/states/states/panel_states";
	import * as Y from "yjs";
	import Weekly from "$lib/panels/journal/Weekly.svelte";
	let props = $props();

	let eventProxyManager = db.eventProxyManager;
	let panelStateMap = db.doc.getMap("panelStates") as Y.Map<StateMap>;
	let journalProxyManager = db.journalProxyManager;
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
		class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
	>
		<Weekly
			panelId="weekly"
			{journalProxyManager}
			allPanelStates={panelStateMap}
		/>
	</Pane>
</PaneGroup>
