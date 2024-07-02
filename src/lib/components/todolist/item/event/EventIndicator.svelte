<script lang="ts">
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { onDestroy } from 'svelte';
	import { highlightFEventIds } from '$lib/states/stores';
	import type { Database } from '$lib/states/data';

	export let db: Database;
	export let eventId: string;

	function calculateTimeLength(start: number, end: number, isAllDay: boolean) {
		return 10;
	}

	const unobserve = db.observeEvent(eventId, (updated) => {
		if (start !== updated.start) {
			start = updated.start;
		}
		if (end !== updated.end) {
			end = updated.end;
		}
		if (isAllDay !== updated.isAllDay) {
			isAllDay = updated.isAllDay;
		}
		if (isCompleted !== updated.isCompleted) {
			isCompleted = updated.isCompleted;
		}
	});

	onDestroy(() => {
		unobserve();
	});
	const event = db.getEventData(eventId);
	let start = event.start;
	let end = event.end;
	let isAllDay = event.isAllDay;
	let isCompleted = event.isCompleted;
</script>

<div style:width={calculateTimeLength(start, end, isAllDay) + 'px'} class=" z-50 mr-1">
	<HoverCard.Root
		openDelay={100}
		onOpenChange={(open) => {
			if (open) {
				highlightFEventIds.add(eventId);
			} else {
				highlightFEventIds.delete(eventId);
			}
		}}
	>
		<HoverCard.Trigger>
			<div
				class=" h-1 w-full cursor-pointer rounded-full bg-slate-600 transition-all duration-100 hover:h-2"
			/>
		</HoverCard.Trigger>
		<HoverCard.Content side="top" sideOffset={24}>
			start: {new Date(start)} <br />
			end: {end}<br />
			isAllDay: {isAllDay}
			isCompleted: {isCompleted}
			{JSON.stringify(event)}
		</HoverCard.Content>
	</HoverCard.Root>
</div>
