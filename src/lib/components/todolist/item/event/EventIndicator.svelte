<script lang="ts">
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { highlightFEventIds } from '$lib/states/stores';

	interface Event {
		id: string;
		start: number;
		end: number;
		isAllDay: boolean;
		isCompleted: boolean;
	}
	export let data: Event;
	function calculateTimeLength(start: number, end: number, isAllDay: boolean) {
		return 10;
	}
</script>

<div
	style:width={calculateTimeLength(data.start, data.end, data.isAllDay) + 'px'}
	class=" z-50 mr-1"
>
	<HoverCard.Root
		openDelay={100}
		onOpenChange={(open) => {
			if (open) {
				highlightFEventIds.add(data.id);
			} else {
				highlightFEventIds.delete(data.id);
			}
		}}
	>
		<HoverCard.Trigger>
			<div
				class=" h-1 w-full cursor-pointer rounded-full bg-slate-600 transition-all duration-100 hover:h-2"
			/>
		</HoverCard.Trigger>
		<HoverCard.Content side="top" sideOffset={24}>
			start: {new Date(data.start)} <br />
			end: {data.end}<br />
			isAllDay: {data.isAllDay}
			isCompleted: {data.isCompleted}
			{JSON.stringify(data)}
		</HoverCard.Content>
	</HoverCard.Root>
</div>
