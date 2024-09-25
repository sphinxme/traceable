<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Editor from '$lib/panels/todo/Editor.svelte';
	import Schedule from '$lib/panels/schedule/Schedule.svelte';
	import { db, rootId } from '$lib/states/db';
	import { setContext } from 'svelte';

	setContext('db', db);
</script>

<Resizable.PaneGroup direction="horizontal">
	<Resizable.Pane>
		<Schedule />
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane>
		<Editor {rootId} />
	</Resizable.Pane>
</Resizable.PaneGroup>
