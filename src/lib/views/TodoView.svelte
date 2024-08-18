<script lang="ts">
	import TodoList from '$lib/components/todolist/TodoList.svelte';
	import Title from '$lib/panels/todo/Title.svelte';
	import { Database } from '$lib/states/data';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';
	import { SquarePlus } from 'lucide-svelte';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	export let db: Database;
	export let rootId = 'root';
	setContext('db', db);

	const isLastOneEmpty = writable(true);
	setContext<LastOneEmptyStatus>(LastOneEmptyStatusKey, {
		isLastOneEmpty: isLastOneEmpty
	});

	const insertBottom = () => {
		// 在i下面再加一个
		let rootTaskChildren = db.getTaskChildren(rootId);
		const id = db.createTask({
			id: '',
			textId: '',
			text: '',
			parentIds: [rootId],
			isCompleted: false
		});
		rootTaskChildren.insert(rootTaskChildren.length, [id]);
	};
</script>

<div class="flex grow flex-col p-4">
	<!-- title -->
	<!-- <h1 class="scroll-m-20 py-4 text-3xl font-bold tracking-tight transition-colors first:mt-0">
		<div bind:this={container} />
	</h1> -->
	<Title taskId={rootId} />

	<!-- list -->
	<div class="pl-6">
		<TodoList currentPath={[]} parentTaskId={rootId} />
	</div>
	{#if !$isLastOneEmpty}
		<!-- svelte-ignore a11y-interactive-supports-focus -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			role="button"
			class="ml-3.5 flex w-full flex-row rounded-lg p-1 opacity-20 transition-colors duration-300 hover:bg-slate-300"
			on:click={insertBottom}
		>
			<SquarePlus size={20} />
		</div>
	{/if}
</div>
