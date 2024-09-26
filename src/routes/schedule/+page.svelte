<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Calendar from '$lib/panels/calendar/Calendar.svelte';
	import Schedule from '$lib/panels/schedule/Schedule.svelte';
	import { db } from '$lib/states/db';
	import { setContext } from 'svelte';

	setContext('db', db);
</script>

<Resizable.PaneGroup direction="horizontal">
	<Resizable.Pane>
		<Calendar />
	</Resizable.Pane>
	<Resizable.Handle />
	<Resizable.Pane>
		<Schedule />
	</Resizable.Pane>
</Resizable.PaneGroup>
