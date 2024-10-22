<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Editor from '$lib/panels/todo/Editor.svelte';
	import Schedule from '$lib/panels/schedule/Schedule.svelte';
	import type { Database } from '$lib/states/rxdb';
	import { getContext } from 'svelte';

	const db = getContext<Database>('db');
</script>

<Resizable.PaneGroup direction="horizontal">
	<Resizable.Pane>
		<Schedule />
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane>
		{#await db.getRootId() then rootTask}
			<Editor rootTask={rootTask.$} />
		{/await}
	</Resizable.Pane>
</Resizable.PaneGroup>
