<script lang="ts">
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { highlightFEventIds } from '$lib/states/stores';
	import { Dayjs } from 'dayjs';
	import type { EventProxy } from '$lib/states/rxdb';

	export let data: EventProxy;
	export let isCompleted: boolean;
	let start = data.start$;
	let end = data.end$;
	$: length = ($start - $end) / ((1000 * 60 * 10) / 5); // 10分钟5px
</script>

<div style:width={length + 'px'} class=" z-50 mr-1">
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
			start: {new Dayjs(data.start).format('YYYY/MM/DD HH:mm:ssZ')} <br />
			end: {new Dayjs(data.end).format('YYYY/MM/DD HH:mm:ssZ')}<br />
			isAllDay: {data.isAllDay}
			isCompleted: {isCompleted}
		</HoverCard.Content>
	</HoverCard.Root>
</div>
