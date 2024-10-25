<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Calendar from '$lib/panels/calendar/Calendar.svelte';
	import Editor from '$lib/panels/todo/Editor.svelte';
	import type { Database } from '$lib/states/rxdb';
	import { getContext } from 'svelte';

	const db = getContext<Database>('db');
</script>

<Resizable.PaneGroup direction="horizontal" class="rounded-lg">
	<Resizable.Pane>
		<Calendar />
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane>
		{#await db.getRootId() then rootTask}
			<Editor rootTask={rootTask.$} />
		{/await}
	</Resizable.Pane>
</Resizable.PaneGroup>
