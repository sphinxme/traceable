<script lang="ts">
	import TodoList from "$lib/components/todolist/TodoList.svelte";
	import Title from "$lib/panels/todo/Title.svelte";
	import { CirclePlus } from "@lucide/svelte";
	import { getInteractionContext } from "$lib/interaction/context.svelte";
	import type { TodoController } from "./controller/TodoController.svelte";

	interface Props {
		controller: TodoController;
		showTitle?: boolean;
		highlightTitle?: boolean;
	}

	let { controller, showTitle = true, highlightTitle }: Props = $props();

	const { taskFocus } = getInteractionContext();

	// 不用onMount而是用effect是因为controller可能在运行中被替换
	// 视图注册已移入 focusActions.onTodoReady/destroy
	$effect(() => {
		controller.onTodoReady();
		return () => {
			controller.destroy();
		};
	});

	/** 薄 $effect: 读取 target → 委托 focusActions 展开祖先 */
	$effect(() => {
		const t = taskFocus.target;
		if (t) {
			controller.focusActions.handleRootFocusTarget(t);
		}
	});
</script>

<div
	class="flex grow flex-col todoview"
	style:view-transition-name={controller.transitionActions
		.$todoViewTransitionName}
>
	{#if showTitle}
		<Title {highlightTitle} {controller} />
	{/if}

	<!-- list -->
	<div class="pl-4">
		<TodoList alwaysDisplay {controller} />
	</div>
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		role="button"
		class="pl-3 flex w-full flex-row rounded-lg p-1 opacity-20 transition-colors duration-300 hover:bg-zinc-300"
		onclick={() => {
			controller.task.insertChild();
		}}
	>
		<CirclePlus size={16} />
	</div>
</div>
