<script lang="ts">
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as Resizable from '$lib/components/ui/resizable';
	import Calendar from '$lib/panels/calendar/Calendar.svelte';
	import Editor from '$lib/panels/todo/Editor.svelte';
	import { db } from '$lib/states/data';
	import Schedule from '$lib/panels/schedule/Schedule.svelte';

	export let rootId = 'root';
</script>

<Resizable.PaneGroup direction="horizontal">
	<Resizable.Pane>
		<Schedule />
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane>
		<Editor {db} {rootId} />
	</Resizable.Pane>
</Resizable.PaneGroup>
