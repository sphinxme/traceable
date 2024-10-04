<script lang="ts">
	import TodoList from '$lib/components/todolist/TodoList.svelte';
	import Title from '$lib/panels/todo/Title.svelte';
	import { Database } from '$lib/states/db';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';
	import { SquarePlus } from 'lucide-svelte';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	const db = getContext<Database>('db');
	let todoList: TodoList;
	let title: Title;
	export let rootId;

	const isLastOneEmpty = writable(true);
	setContext<LastOneEmptyStatus>(LastOneEmptyStatusKey, {
		isLastOneEmpty: isLastOneEmpty
	});

	const insertBottom = async () => {
		db.createTask(rootId, Date.now().valueOf(), '');
	};
</script>

<div class="flex grow flex-col p-4">
	<!-- title -->
	<!-- <h1 class="scroll-m-20 py-4 text-3xl font-bold tracking-tight transition-colors first:mt-0">
		<div bind:this={container} />
	</h1> -->
	<Title
		bind:this={title}
		taskId={rootId}
		enterHandle={(range, context, editor) => {
			todoList.insertItem(0, context.suffix);
			editor.editor.deleteText(range.index, Number.MAX_SAFE_INTEGER);
			return false;
		}}
		arrowDownHandle={(range, context, editor) => {
			console.log('got it');
			todoList.focusTop(range.index);
			return false;
		}}
	/>

	<!-- list -->
	<div class="pl-6">
		<TodoList
			bind:this={todoList}
			currentPath={[]}
			parentTaskId={rootId}
			arrowUpHandle={(range, context, editor) => {
				title.focus(range.index);
				return false;
			}}
		/>
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
