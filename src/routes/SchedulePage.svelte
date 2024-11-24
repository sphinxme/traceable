<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from "$lib/components/ui/resizable";
	import Calendar from "$lib/panels/calendar/Calendar.svelte";
	import Schedule from "$lib/panels/schedule/Schedule.svelte";
	let props = $props();
</script>

<PaneGroup direction="horizontal">
	<Pane>
		<Calendar />
	</Pane>
	<PaneResizer />
	<Pane>
		<Schedule />
	</Pane>
</PaneGroup>
