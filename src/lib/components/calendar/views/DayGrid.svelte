<script lang="ts">
	import type { Dayjs } from "dayjs";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { range } from "./geometry";
	import { isRestDay } from "./geometry";
	import { roundToNearest15MinutesDayjs } from "./geometry";
	import { dayDropZone, dayExternalDropZone } from "./interact.svelte";
	import type { DragService } from "$lib/interaction/services/DragService.svelte";

	interface Props {
		displayDays: Dayjs[];
		offsetByHour: number;
		notWorkHourRange: ReadonlyArray<{ start: number; end: number }>;
		dayHeight: number;
		containerWidth: number;
		drag: DragService;
		onDragOver: (day: Dayjs, task: Task, topPx: number) => void;
		onDrop: (day: Dayjs, task: Task, topPx: number) => void;
		onDragEnd: () => void;
	}

	let {
		displayDays,
		offsetByHour,
		notWorkHourRange,
		dayHeight = $bindable(),
		containerWidth = $bindable(),
		drag,
		onDragOver,
		onDrop,
		onDragEnd,
	}: Props = $props();
</script>

<div
	data-tauri-drag-region
	style:display="grid"
	style:grid-column="1 / 1"
	style:grid-row="1 / -1"
	style:grid-template-columns="subgrid"
	style:grid-template-rows="subgrid"
	class="sticky left-0 rounded-lg"
	style:z-index="2"
>
	<div class=" flex flex-col" style:grid-area="3 / 1 ">
		<div style:flex="1"></div>
		{#each range(1, 23)}
			<div
				style:flex="2"
				class="relative flex items-center justify-end text-xs"
			>
				<div
					style:z-index="2"
					class=" absolute left-full top-1/2 h-0 w-dvw -translate-y-1/2 border-b border-zinc-300"
				></div>
			</div>
		{/each}
		<div style:flex="1"></div>
	</div>
</div>

<div
	data-tauri-drag-region
	style:display="grid"
	style:grid-column="1 / 1"
	style:grid-row="1 / -1"
	style:grid-template-columns="subgrid"
	style:grid-template-rows="subgrid"
	class="sticky z-10 left-0 bg-background shadow-xl rounded-tl-lg"
>
	<div
		class="z-10 relative flex items-center justify-end text-xs font-extralight text-zinc-500"
		style:grid-area="2 / 1 "
	>
		<div
			style:z-index="7"
			class=" absolute left-full top-0 h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
		></div>
		<p class=" pr-2">全天</p>
		<div
			style:z-index="7"
			class=" absolute left-full top-full h-0 w-dvw -translate-y-1/2 border-b border-slate-300"
		></div>
	</div>

	<div
		class=" z-10 flex flex-col font-extralight text-zinc-400"
		style:grid-area="3 / 1 "
	>
		<div style:flex="1"></div>
		{#each range(1 + offsetByHour, 23 + offsetByHour) as hour}
			<div
				style:flex="2"
				class="relative flex items-center justify-end text-xs"
			>
				<p class=" pr-2">
					{hour % 12 ? hour % 12 : hour > 12 ? 12 : 0}
					{hour > 12 && hour < 24 ? "PM" : "AM"}
				</p>
			</div>
		{/each}
		<div style:flex="1"></div>
	</div>
</div>

<div
	style:grid-column="2 / -1"
	style:grid-row="3 / 3"
	class=" grid"
	style:z-index="1"
	style:grid-template-rows="repeat(48, 1fr)"
>
	{#each notWorkHourRange as range}
		<div
			style:grid-row="{(range.start - offsetByHour) * 2 + 1} / {(range.end -
				offsetByHour) *
				2 +
				1}"
			class="relative flex items-center justify-end text-xs bg-zinc-100"
		></div>
	{/each}
</div>

<div
	style:z-index="7"
	style:display="grid"
	style:grid-column="2 / -1"
	style:grid-row="3 / 3"
	style:grid-template-columns="subgrid"
	style:grid-template-rows="subgrid"
	bind:offsetHeight={dayHeight}
	bind:offsetWidth={containerWidth}
>
	{#each displayDays as day, i (day)}
		<div
			class="text-center {isRestDay(day)
				? 'bg-zinc-300 opacity-30'
				: ''}"
			style:grid-area="1 / {i + 1} / 1 / {i + 1}"
			use:dayDropZone
			use:dayExternalDropZone={{
				drag,
				onDragEnd() {
					onDragEnd();
				},
				onDragOver(task, topPx) {
					onDragOver(day, task, topPx);
				},
				onDrop(task, topPx) {
					onDrop(day, task, topPx);
				},
			}}
			data-dayts={day.valueOf()}
		></div>
	{/each}
</div>
