<script lang="ts">
	import * as HoverCard from "$lib/components/ui/hover-card";
	import type { EventProxy } from "$lib/states/meta/event.svelte";
	import {
		foucsingEventIds,
		highlightFEventIds,
	} from "$lib/states/stores.svelte";
	import dayjs from "dayjs";
	import { tick } from "svelte";

	interface Props {
		data: EventProxy;
		isCompleted: boolean;
	}

	let { data, isCompleted }: Props = $props();
	let start = data.start$;
	let end = data.end$;
	let length = $derived(($end - $start) / (1000 * 60 * 2)); // 10分钟5px
</script>

<div
	style:width={length + "px"}
	class="parent z-40 mr-1 transition"
	style:transition-property="width, margin"
>
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
		<HoverCard.Trigger
			onclick={() => {
				foucsingEventIds[data.id] = true;
			}}
		>
			<div
				class=" opacity-70 indicator h-1 w-full cursor-pointer rounded-full bg-zinc-600 transition-all duration-100"
			></div>
		</HoverCard.Trigger>
		<HoverCard.Content side="top" sideOffset={24}>
			start: {dayjs(data.start).format("HH:mm:ssZ")} <br />
			end: {dayjs(data.end).format("HH:mm:ssZ")}<br />
			isCompleted: {isCompleted}<br />
			length: {length}<br />
		</HoverCard.Content>
	</HoverCard.Root>
</div>

<style>
	.parent:hover .indicator {
		height: 6px;
		opacity: 80%;
	}
	.parent:hover {
		margin-right: 6px;
	}
</style>
