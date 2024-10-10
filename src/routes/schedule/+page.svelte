<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Calendar from '$lib/panels/calendar/Calendar.svelte';
	import Schedule from '$lib/panels/schedule/Schedule.svelte';
	import type { Database } from '$lib/states/rxdb';
	import { getContext } from 'svelte';
	// import { db } from '$lib/states/db';
	// import { setContext } from 'svelte';

	// setContext('db', db);
	const db = getContext<Database>('db');
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
