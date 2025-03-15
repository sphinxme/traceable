<script lang="ts">
	import Calendar from "$lib/components/calendar/Calendar.svelte";
	import type { EventProxyManager } from "$lib/states/meta/event.svelte";

	let { eventProxyManager }: { eventProxyManager: EventProxyManager } =
		$props();
</script>

<Calendar {eventProxyManager} />
