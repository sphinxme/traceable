<script lang="ts">
	import dayjs, { type Dayjs } from "dayjs";
	import Focusable from "$lib/components/ui/focusable/Focusable.svelte";

	interface Props {
		displayDays: Dayjs[];
		offsetByHour: number;
		scrollStates: Record<string, { scrollTop: number; scrollLeft: number }>;
	}

	let { displayDays, offsetByHour, scrollStates }: Props = $props();
</script>

<div
	data-tauri-drag-region
	style:display="grid"
	style:grid-column="2 / -1"
	style:grid-row="1 / 1"
	style:grid-template-columns="subgrid"
	style:grid-template-rows="subgrid"
	class=" header-shadow sticky top-0 bg-background py-3 text-center text-zinc-700"
	style:z-index="11"
>
	{#each displayDays as day, i (day)}
		<div
			data-tauri-drag-region
			class=" flex flex-col items-center justify-between"
			style:grid-area="1 / {i + 1} / 1 / {i + 1}"
		>
			<div
				class="text-base font-medium"
				class:font-light={!day.isSame(
					dayjs().add(-offsetByHour, "hour"),
					"day",
				)}
				class:text-red-500={day.isSame(
					dayjs().add(-offsetByHour, "hour"),
					"day",
				)}
			>
				{day.format("ddd")}
			</div>
			<Focusable
				focus={!scrollStates["weekPanel"] &&
					day.isSame(
						dayjs().add(-offsetByHour, "hour"),
						"day",
					)}
				inline="center"
				block="start"
			/>

			<div
				style:font-size="0.7rem"
				class=" text-xs font-extralight text-zinc-400"
			>
				{day.format("MM-DD")}
			</div>
		</div>
	{/each}
</div>

<style>
	.header-shadow::after {
		content: "";
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 20px;
		z-index: 7;
		background-image: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.05),
			transparent
		);
		transform: translateY(100%);
		pointer-events: none;
	}
</style>
