<script lang="ts">
	// import * as Resizable from "$lib/components/ui/resizable";
	import { PaneGroup, Pane, PaneResizer } from "paneforge";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import Editor from "$lib/panels/todo/Editor.svelte";
	import type { Database } from "$lib/states/rxdb";
	import { getContext } from "svelte";

	let props = $props();

	const db = getContext<Database>("db");
</script>

<PaneGroup direction="horizontal" class="rounded-lg">
	<Pane>
		<Calendar />
	</Pane>
	<!-- TODO:resizer还不能用 -->
	<PaneResizer />
	<Pane>
		{#await db.getRootId()}
			loading
		{:then rootTask}
			<Editor rootTask={rootTask.$} />
		{/await}
	</Pane>
</PaneGroup>
