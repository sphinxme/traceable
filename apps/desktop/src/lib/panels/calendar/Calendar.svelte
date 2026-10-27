<script lang="ts">
	import Calendar from "$lib/components/calendar/Calendar.svelte";
	import type { Store } from "$lib/states/meta/store.svelte";

	let { store }: { store: Store } =
		$props();
</script>

<Calendar {store} />
