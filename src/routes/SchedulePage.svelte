<script lang="ts">
	// import * as Resizable from "$lib/components/ui/resizable";
	import { PaneGroup, Pane, PaneResizer } from "paneforge";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import Schedule from "$lib/panels/schedule/Schedule.svelte";
	import type { Database } from "$lib/states/rxdb";
	import { getContext } from "svelte";
	// import { db } from '$lib/states/db';
	// import { setContext } from 'svelte';

	// setContext('db', db);
	let props = $props();
	const db = getContext<Database>("db");
</script>

<PaneGroup direction="horizontal">
	<Pane>
		<Calendar />
	</Pane>
	<PaneResizer class=" hover:bg-slate-300 transition-colors w-0.5" />
	<Pane>
		<Schedule />
	</Pane>
</PaneGroup>
