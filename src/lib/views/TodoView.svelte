<script lang="ts">
	import TodoList from '$lib/components/todolist/TodoList.svelte';
	import Title from '$lib/panels/todo/Title.svelte';
	import { type TaskProxy } from '$lib/states/rxdb';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';
	import { SquarePlus } from 'lucide-svelte';
	import type { Observable } from 'rxjs';
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	let todoList: TodoList;
	let title: Title;
	export let task: Observable<TaskProxy>;

	const foucsByLocation = (paths: { id: string; index: number }[]) => {
		todoList.foucsIntoByLocation(paths);
	};
	setContext('focusByLocation', foucsByLocation);

	const isLastOneEmpty = writable(true);
	setContext<LastOneEmptyStatus>(LastOneEmptyStatusKey, {
		isLastOneEmpty: isLastOneEmpty
	});
</script>

<div class="flex grow flex-col p-4">
	<Title
		bind:this={title}
		{task}
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
			location={[]}
			parent={task}
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
			on:click={async () => {
				$task.addChild(Number.MAX_SAFE_INTEGER);
			}}
		>
			<SquarePlus size={20} />
		</div>
	{/if}
</div>
