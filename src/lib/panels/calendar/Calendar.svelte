<script lang="ts">
	import Calendar from '$lib/components/calendar/Calendar.svelte';
	import type { Database } from '$lib/states/data';

	export let db: Database;
	export let rootId: string;
</script>

<Calendar />
