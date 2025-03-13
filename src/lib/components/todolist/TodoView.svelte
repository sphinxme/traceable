<script lang="ts">
	import TodoList from "$lib/components/todolist/TodoList.svelte";
	import Title from "$lib/panels/todo/Title.svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";
	import {
		setStateIntoContext,
		type EditorItemState,
	} from "$lib/states/states/panel_states";
	import { CirclePlus, SquarePlus } from "lucide-svelte";
	import type { Observable } from "rxjs";
	import { setContext } from "svelte";

	let todoList: TodoList;
	// svelte-ignore non_reactive_update
	let title: Title;
	interface Props {
		task: TaskProxy;
		showTitle?: boolean;
		highlightTitle?: boolean;
		rootItemState: Observable<EditorItemState>;
	}

	let {
		task,
		showTitle = true,
		highlightTitle,
		rootItemState,
	}: Props = $props();
	setStateIntoContext(rootItemState);
	$effect(() => {
		setStateIntoContext(rootItemState);
	});

	export const foucsByLocation = (
		paths: TaskProxy[],
		index: number,
		highlight: boolean = false,
	) => {
		paths.shift();
		todoList.foucsIntoByLocation(paths, index, highlight);
	};
	setContext("focusByLocation", foucsByLocation);
</script>

<div class="flex grow flex-col">
	{#if showTitle}
		<Title
			{highlightTitle}
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
	{/if}

	<!-- list -->
	<div class="pl-4">
		<TodoList
			display
			bind:this={todoList}
			parent={task}
			arrowUpHandle={(range, context, editor) => {
				title?.focus(range.index);
				return false;
			}}
		/>
	</div>
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		role="button"
		class="pl-3 flex w-full flex-row rounded-lg p-1 opacity-20 transition-colors duration-300 hover:bg-zinc-300"
		onclick={() => {
			task.insertChild();
		}}
	>
		<CirclePlus size={16} />
	</div>
</div>
