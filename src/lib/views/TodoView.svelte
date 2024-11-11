<script lang="ts">
	import TodoList from "$lib/components/todolist/TodoList.svelte";
	import Title from "$lib/panels/todo/Title.svelte";
	import { type TaskProxy } from "$lib/states/rxdb";
	import { SquarePlus } from "lucide-svelte";
	import type { Observable } from "rxjs";
	import { setContext } from "svelte";

	// refs
	let todoList: TodoList;
	let title: Title;
	interface Props {
		task: Observable<TaskProxy>;
	}

	let { task }: Props = $props();

	const foucsByLocation = (paths: { id: string; index: number }[]) => {
		todoList.foucsIntoByLocation(paths);
	};
	setContext("focusByLocation", foucsByLocation);

	let isLastOneEmpty = $state(false);
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
			todoList.focusTop(range.index);
			return false;
		}}
	/>

	<!-- list -->
	<div class="pl-6">
		<TodoList
			bind:isLastOneEmpty
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
	<!-- TODO:还没弄好 -->
	{#if isLastOneEmpty}
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			role="button"
			class="ml-3.5 flex w-full flex-row rounded-lg p-1 opacity-20 transition-colors duration-300 hover:bg-slate-300"
			onclick={() => {
				$task.addChild();
			}}
		>
			<SquarePlus size={20} />
		</div>
	{/if}
</div>
