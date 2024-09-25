<script lang="ts">
	import { Database } from '$lib/states/db';
	import { yStore } from '$lib/states/ystore';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';

	export let taskId: string;
	const db = getContext<Database>('db');

	let text: Writable<string>;

	// todo: 替换为top-level await
	const loading = db.getTask(taskId).then((task) => {
		const yText = db.texts.get(task.textId);
		if (!yText) {
			throw new Error(`invalid textId:${task.textId}`);
		}
		text = yStore(yText);
	});
</script>

{#await loading}
	loading...
{:then}
	{$text || '未命名'}
{/await}
