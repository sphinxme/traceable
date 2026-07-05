<script lang="ts">
	import { untrack } from "svelte";
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

	const { focus } = getInteractionContext();

	// 不用onMount而是用effect是因为controller可能在运行中被替换
	$effect(() => {
		controller.onTodoReady();
		return () => {
			controller.destroy();
		};
	});

	// 注册视图: Map<rootViewId, { panelId, rootTask }>
	$effect(() => {
		focus.registerView(
			controller.viewId,
			controller.panel.id,
			controller.task,
		);
		return () => focus.unregisterView(controller.viewId);
	});

	// 响应: 本视图被选中时, 沿路径展开祖先
	$effect(() => {
		const nonce = focus.focusNonce;
		const targetRoot = focus.targetRootViewId;
		if (nonce > 0 && targetRoot === controller.viewId) {
			untrack(() => controller.unfoldByPath(focus.targetPath!));
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
