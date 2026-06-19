<script lang="ts">
	import dayjs from "dayjs";
	import { calculateTopOffset } from "./geometry";

	export interface DraggingTaskEvent {
		start: number;
		end: number;
	}

	interface Props {
		draggingTaskEvent: DraggingTaskEvent | null;
		getColumnIndex: (t: number) => number;
		offsetByHour: number;
		dayHeight: number;
	}

	let { draggingTaskEvent, getColumnIndex, offsetByHour, dayHeight }: Props =
		$props();
</script>

{#if draggingTaskEvent}
	<div
		style:pointer-events="none"
		style:z-index="12"
		style:box-shadow="0px 0px 16px 0px rgb(212,212,216,0.8) inset"
		class=" relative text-zinc-700 rounded-lg shadow-inner text-center font-extralight"
		style:grid-row="3"
		style:grid-column={getColumnIndex(draggingTaskEvent.start) + 2}
		style:top="{calculateTopOffset(
			draggingTaskEvent.start,
			offsetByHour,
			dayHeight,
		)}px"
		style:height="{Math.floor((30 / (24 * 60)) * dayHeight)}px"
	>
		{dayjs(draggingTaskEvent.start).format("HH:mm")}-{dayjs(
			draggingTaskEvent.end,
		).format("HH:mm")}
	</div>
{/if}
