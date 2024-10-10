<script lang="ts">
	import { Database, type TaskProxy } from '$lib/states/rxdb';
	import { yStore } from '$lib/states/ystore';
	import type { Observable } from 'rxjs';
	import { getContext } from 'svelte';

	export let task: Observable<TaskProxy>;
	const db = getContext<Database>('db');
	let text = yStore(db.texts.get($task.textId));
</script>

{$text || '未命名'}
