<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import Editor from "$lib/panels/todo/Editor.svelte";
	import type { Database } from "$lib/states/rxdb";
	import { getContext } from "svelte";

	let props = $props();

	const db = getContext<Database>("db");
</script>

<PaneGroup direction="horizontal">
	<Pane>
		<Calendar />
	</Pane>
	<PaneResizer />
	<Pane>
		{#await db.getRootId()}
			loading
		{:then rootTask}
			<Editor rootTask={rootTask.$} />
		{/await}
	</Pane>
</PaneGroup>
