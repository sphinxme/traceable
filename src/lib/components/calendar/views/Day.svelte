<script lang="ts">
	import dayjs, { Dayjs } from 'dayjs';
	import type { Chunk } from '../data';
	import { interact } from './interact';

	export let day: Dayjs;
	export let chunks: Chunk[] = [
		{
			eventId: 'e1',
			event: {
				id: '',
				taskId: 'task-test',
				start: 1723360784000, // 7/22 10
				end: 1723371599000, // 7/22 14
				isAllDay: false,
				isCompleted: false
			},
			start: dayjs(1723360784000),
			end: dayjs(1723371599000)
		}
	];

	let color = 'red';
	let height: number;

	function percent(start: Dayjs, end: Dayjs) {
		const a = start.diff(end) / (24 * 60 * 60 * 1000);
		if (a < 1 && a > 0) {
			return a;
		}
		return 0;
	}
	
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	bind:clientHeight={height}
	class="day relative h-full overflow-visible border border-cyan-200 bg-slate-50"
	on:dragover={(e) => {
		e.preventDefault();
		color = 'white';
	}}
	on:drop={(e) => {
		e.preventDefault();
	}}
>
	{#each chunks as chunk}
		<div
			style:top="{Math.floor(percent(chunk.start, day.startOf('day')) * height)}px"
			style:height={Math.floor(percent(chunk.end, chunk.start) * height) + 'px'}
			class="child flex flex-col justify-between absolute rounded-2xl bg-slate-500 shadow-lg"
		>
			{chunk.start.format('HH:mm')}
			{chunk.end.format('HH:mm')}
		</div>
	{/each}
</div>

<style>
	.child {
		position: absolute;
		/* top: 0; */
		/* left: 0; */
	}
</style>
