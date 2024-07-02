<script lang="ts">
	import { Database } from '$lib/states/data';
	import { onDestroy } from 'svelte';
	import { resize } from './resize';

	export let timeToRowNum: (t: number) => number;
	export let timeToColNum: (t: number) => number;
	export let eventId: string;
	export let db: Database;

	let data = db.getEventData(eventId);
	const unobserve = db.observeEvent(eventId, (event) => {
		data = event;
	});
	onDestroy(() => {
		unobserve();
	});

	let shadow = false;
	let shadowEl: HTMLDivElement;
	let shadowSpan: number;
</script>

<div
	class="relative z-10 rounded bg-slate-300 shadow-lg"
	style:grid-area="{timeToRowNum(data.start)} / {timeToColNum(data.start)} / {timeToRowNum(
		data.end
	)} / {timeToColNum(data.start)}"
	use:resize={{
		onDragStart(row, col) {
			shadow = true;
			shadowSpan = timeToRowNum(data.start) - timeToRowNum(data.end);
			shadowEl.style.gridColumnStart = `${col}`;
			shadowEl.style.gridColumnEnd = `${col + 1}`;
			shadowEl.style.gridRowStart = `${row}`;
			shadowEl.style.gridRowEnd = `${row + shadowSpan}`;
		},
		onDragEnd(row, col) {
			console.log('end');
			shadow = false;
		},
		onDragOver(row, col) {
			shadowEl.style.gridColumnStart = `${col}`;
			shadowEl.style.gridColumnEnd = `${col + 1}`;
			shadowEl.style.gridRowStart = `${row}`;
			shadowEl.style.gridRowEnd = `${row + shadowSpan}`;
		},

        onResizeEnd(row, col) {
            if (data) {
                data.start
            }
            if (row) {

            }
            if (col) {

            }
            db.doc.transact(() => {
            
            })
        },

		data,
		timeToColNum,
		timeToRowNum
	}}
>
	{data.taskId}:{timeToColNum(data.start)}:{timeToRowNum(data.start)}:{timeToRowNum(data.end)}
</div>

{#if shadow}
	<div class=" z-20 rounded bg-slate-500 opacity-30" bind:this={shadowEl} />
{/if}
