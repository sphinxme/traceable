<script lang="ts">
	import * as HoverCard from "$lib/components/ui/hover-card";
	import { highlightFEventIds } from "$lib/states/stores.svelte";
	import dayjs from "dayjs";
	import type { EventProxy } from "$lib/states/rxdb";

	interface Props {
		data: EventProxy;
		isCompleted: boolean;
	}

	let { data, isCompleted }: Props = $props();
	let start = data.start$;
	let end = data.end$;
	let length = $derived(($end - $start) / (1000 * 60 * 10)); // 10分钟5px
</script>

<div style:width={length + "px"} class=" z-40 mr-1">
	<HoverCard.Root
		openDelay={100}
		onOpenChange={(open) => {
			if (open) {
				highlightFEventIds[data.id] = true;
			} else {
				highlightFEventIds[data.id] = false;
			}
		}}
	>
		<HoverCard.Trigger>
			<div
				class=" h-1 w-full cursor-pointer rounded-full bg-slate-600 transition-all duration-100 hover:h-2"
			></div>
		</HoverCard.Trigger>
		<HoverCard.Content side="top" sideOffset={24}>
			start: {dayjs(data.start).format("HH:mm:ssZ")} <br />
			end: {dayjs(data.end).format("HH:mm:ssZ")}<br />
			isAllDay: {data.isAllDay}<br />
			isCompleted: {isCompleted}<br />
			length: {length}<br />
		</HoverCard.Content>
	</HoverCard.Root>
</div>
