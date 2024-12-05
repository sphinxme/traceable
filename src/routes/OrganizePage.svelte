<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Editor from "$lib/panels/todo/Editor.svelte";
	import Schedule from "$lib/panels/schedule/Schedule.svelte";
	import type { Database } from "$lib/states/rxdb";
	import { getContext } from "svelte";

	let props = $props();

	const db = getContext<Database>("db");
</script>

<PaneGroup direction="horizontal" class="rounded-lg">
	<Pane>
		<Schedule />
	</Pane>
	<PaneResizer />
	<Pane>
		{#await db.getAndInitRootId() then rootTask}
			<Editor rootTask={rootTask.$} />
		{/await}
	</Pane>
</PaneGroup>
