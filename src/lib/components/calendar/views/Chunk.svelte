<script lang="ts">
	import type { Database, Event, Task } from '$lib/states/data';
	import type { Dayjs } from 'dayjs';
	import { onDestroy } from 'svelte';

	export let start: Dayjs;
	export let end: Dayjs;

	export let event: Event;
	export let db: Database;
	let title = '';
	const yText = db.getTaskText(event.taskId);

	const setTitle = () => (title = yText.toJSON());
	yText.observe(setTitle);
	onDestroy(() => yText.unobserve(setTitle));

	let editing = false;

	export let onEditing: (eventId: string, start:string) => void;

	/**
	 * 单位px
	 */
	export let offset: number;

	/**
	 * 单位px
	 */
	export let height: number;
</script>

<div
	style:transform="translateY({offset}px})"
	style:height="{height}px"
	class="child flex flex-col justify-between rounded-2xl bg-slate-500 shadow-lg"
>
	<!-- top grabber -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class=" h-1 rounded-full bg-white"
		on:mousedown={(e) => {
			console.log(e);
		}}
		on:mousemove={(e) => {
			console.log(e);
		}}
	>
		-
	</div>

	{start.format('HH:mm')} - {end.format('HH:mm')}
	{title}

	<!-- bottom grabber -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class=" h-1 rounded-full bg-white"
		on:mousedown={(e) => {
			console.log(e);
		}}
		on:mousemove={(e) => {
			console.log(e);
		}}
	>
		-
	</div>
</div>
