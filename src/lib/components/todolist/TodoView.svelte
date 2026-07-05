<script lang="ts">
	/**
	 * TodoView — 视图入口组件（面板根）。
	 *
	 * 渲染面板的根级 Todo 大纲，包含：
	 * - 标题（Title.svelte，外部引入）
	 * - 子列表（TodoList.svelte，alwaysDisplay = true）
	 * - 新增按钮（点击调用 `task.insertChild()`）
	 *
	 * 对应 root `TodoController`（由 `EditorPanelController` 通过 `createRoot` 创建）。
	 * 生命周期由 `$effect` 驱动：mount 时 `onTodoReady()`，destroy 时 `destroy()`。
	 *
	 * @prop controller - 面板根 TodoController
	 * @prop showTitle - 是否显示标题（默认 true）
	 * @prop highlightTitle - 是否高亮标题
	 */
	import TodoList from "$lib/components/todolist/TodoList.svelte";
	import Title from "$lib/panels/todo/Title.svelte";
	import { CirclePlus } from "@lucide/svelte";
	import type { TodoController } from "./controller/TodoController.svelte";

	interface Props {
		controller: TodoController;
		showTitle?: boolean;
		highlightTitle?: boolean;
	}

	let { controller, showTitle = true, highlightTitle }: Props = $props();

	// 不用onMount而是用effect是因为controller可能在运行中被替换
	// 视图注册已移入 focusActions.onTodoReady/destroy
	$effect(() => {
		controller.onTodoReady();
		return () => {
			controller.destroy();
		};
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
