<script lang="ts">
	import * as HoverCard from "$lib/components/ui/hover-card";
	import type { EventProxy } from "$lib/states/meta/event.svelte";
	import {
		foucsingEventIds,
		highlightFEventIds,
	} from "$lib/states/stores.svelte";
	import dayjs from "dayjs";

	interface Props {
		data: EventProxy;
		isCompleted: boolean;
	}

	let { data, isCompleted }: Props = $props();
	let start = data.start$;
	let end = data.end$;
	let length = $derived(($end - $start) / (1000 * 60 * 2)); // 10分钟5px

	function formatDuration(duration: number): string {
		const hours = Math.floor(duration / (60 * 60 * 1000));
		const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));

		if (hours === 0) {
			return `${minutes}分钟`;
		}
		if (minutes === 0) {
			return `${hours}小时`;
		}
		if (minutes === 30) {
			return `${hours}.5小时`;
		}

		return `${hours}小时${minutes}分钟`;
	}
</script>

<div
	style:width={length + "px"}
	class="parent z-40 mr-1 transition"
	style:transition-property="width, margin"
>
	<HoverCard.Root
		openDelay={0}
		closeDelay={0}
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
			<div class=" text-sm font-semibold">
				{dayjs(data.start).format("YYYY-MM-DD")}
			</div>
			<div class=" text-xs font-semibold">
				{dayjs(data.start).format("HH:mm")} -
				{dayjs(data.end).format("HH:mm")}
			</div>
			<div>{formatDuration(data.end - data.start)}</div>
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
