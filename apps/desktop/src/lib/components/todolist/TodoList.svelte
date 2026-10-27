<script lang="ts">
	/**
	 * TodoList — 子列表容器组件。
	 *
	 * 遍历 `controller.task.children` 渲染子条目，每个子条目前后插入 `TaskDropable` 拖放插槽。
	 *
	 * **显示控制**：
	 * - `alwaysDisplay = true`（TodoView 根级）→ 始终显示
	 * - `alwaysDisplay = false`（Todo 子级）→ 受 `controller.statesTree.$folded` 控制
	 *
	 * **折叠动画**：使用 `svelte/transition` 的 `slide` 过渡。
	 *
	 * **View Transition**：`$todoListViewTransitionName` 用于缩放时的列表展开/收起动画。
	 *
	 * **side snippet**：可选的侧边装饰（如缩进线），由父组件通过 snippet 传入。
	 *
	 * @prop controller - TodoController（列表所属的控制器）
	 * @prop side - 可选的侧边装饰 snippet
	 * @prop alwaysDisplay - 是否始终显示（不受折叠控制），默认 false
	 */
	import type { Snippet } from "svelte";

	import Todo from "./Todo.svelte";
	import TaskDropable from "./dnd/TaskDropable.svelte";

	import type { TodoController } from "./controller/TodoController.svelte";
	import { slide } from "svelte/transition";

	interface Props {
		controller: TodoController;
		side?: Snippet;
		alwaysDisplay?: boolean;
	}

	let { controller, side, alwaysDisplay = false }: Props = $props();

	let children = $derived(controller.task.children);
	let display = $derived(alwaysDisplay || !controller.statesTree.$folded);
</script>

{#if display}
	<div
		transition:slide
		style:view-transition-name={controller.transitionActions
			.$todoListViewTransitionName}
		class="flex w-full flex-row"
	>
		{@render side?.()}

		{#key children}
			<div class="relative w-full" role="list">
				{#each children as child, i (child.id)}
					<div>
					<TaskDropable
						{controller}
						index={i}
						topTaskId={child.id}
						bottomTaskId={children.at(i - 1)?.id}
					/>

						<Todo parentController={controller} task={child} />
					</div>
				{/each}

				<TaskDropable
					{controller}
					index={children.size}
					topTaskId={children.getId(children.size - 1)}
				/>
			</div>
		{/key}
	</div>
{/if}
