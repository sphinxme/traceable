<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Calendar from '$lib/panels/calendar/Calendar.svelte';
	import Editor from '$lib/panels/todo/Editor.svelte';
	import { db, rootId } from '$lib/states/db';
	import { setContext } from 'svelte';

	setContext('db', db);
</script>

<Resizable.PaneGroup direction="horizontal">
	<Resizable.Pane>
		<Calendar />
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane>
		<Editor {rootId} />
	</Resizable.Pane>
</Resizable.PaneGroup>
