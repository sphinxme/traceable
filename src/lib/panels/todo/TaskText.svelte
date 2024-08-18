<script lang="ts">
	import { Database } from '$lib/states/data';
	import { onDestroy } from 'svelte';

	export let taskId: string;
	export let db: Database;

	const yText = db.getTaskText(taskId);
	let text: string = yText.toJSON();
	const updateText = () => (text = yText.toJSON());

	yText.observe(updateText);
	onDestroy(() => yText.unobserve(updateText));
</script>

{text}
