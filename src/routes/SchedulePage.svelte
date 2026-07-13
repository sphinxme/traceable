<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import { db } from "@/state";
	import { type StateMap } from "$lib/states/states/StatesTree.svelte";
	import * as Y from "yjs";
	import Weekly from "$lib/panels/journal/Weekly.svelte";
	let props = $props();

	let panelStateMap = db.doc.getMap("panelStates") as Y.Map<StateMap>;
</script>

<PaneGroup direction="horizontal" class=" gap-1.5 p-3 pt-0">
	<Pane
		style="transition-property: box-shadow, border;"
		class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
	>
		<Calendar store={db.store} />
	</Pane>
	<PaneResizer />
	<Pane
		style="transition-property: box-shadow, border;"
		class="rounded-lg shadow-lg transition-shadow duration-700 focus-within:shadow-2xl"
	>
		<Weekly
			panelId="weekly"
			store={db.store}
			allPanelStates={panelStateMap}
		/>
	</Pane>
</PaneGroup>
