<script lang="ts">
	import { Database } from '$lib/states/data';
	import { onDestroy } from 'svelte';
	import { interact } from './resize';
	import type { Dayjs } from 'dayjs';

	export let timeToRowNum: (t: number) => number;
	export let timeToColNum: (t: number) => number;
	export let cellToTime: (row: number, col: number) => Dayjs;
	export let eventId: string;
	export let db: Database;

	let data = db.getEventData(eventId);
	const unobserve = db.observeEvent(eventId, (event) => {
		data = event;
		start = data.start;
		end = data.end;
	});
	let start = data.start;
	let end = data.end;
	onDestroy(() => {
		unobserve();
	});

	let shadow = false;
	let shadowEl: HTMLDivElement;
	let shadowSpan: number;
</script>

<div
	class="relative z-10 rounded bg-slate-300 shadow-lg"
	style:grid-area="{timeToRowNum(start)} / {timeToColNum(start)} / {timeToRowNum(end)} / {timeToColNum(
		start
	)}"
	use:interact={{
		onDragStart(row, col) {
			shadow = true;
			shadowSpan = timeToRowNum(start) - timeToRowNum(end);
			if (!shadowEl) {
				console.log('no shadow El');
				return;
			}
			shadowEl.style.gridColumnStart = `${col}`;
			shadowEl.style.gridColumnEnd = `${col + 1}`;
			shadowEl.style.gridRowStart = `${row}`;
			shadowEl.style.gridRowEnd = `${row + shadowSpan}`;
		},
		onDragEnd(row, col) {
			// console.log('end');
			shadow = false;
			const startTime = cellToTime(row, col);
			const duration = end - start;
			start = startTime.valueOf();
			end = start + duration;
			// console.log({ data });
			// console.log(startTime.format());
		},
		onDragOver(row, col) {
			if (!shadowEl) {
				console.log('no shadow El');
				return;
			}
			shadowEl.style.gridColumnStart = `${col}`;
			shadowEl.style.gridColumnEnd = `${col + 1}`;
			shadowEl.style.gridRowStart = `${row}`;
			shadowEl.style.gridRowEnd = `${row + shadowSpan}`;
		},

		onResizeEnd(row, col) {
			console.log('resize end', { row, col });
			if (data) {
				start;
			}
			if (row) {
			}
			if (col) {
			}
			// cellToTime(row, col)
			db.doc.transact(() => {});
		},

		data,
		timeToColNum,
		timeToRowNum
	}}
>
	{data.taskId}:{timeToColNum(start)}:{timeToRowNum(start)}:{timeToRowNum(end)}
</div>

{#if shadow}
	<div class=" z-20 rounded bg-slate-500 opacity-30" bind:this={shadowEl} />
{/if}
