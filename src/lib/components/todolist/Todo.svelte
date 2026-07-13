<script lang="ts">
	/**
	 * Todo — 单个 Todo 条目组件（递归渲染）。
	 *
	 * 每个 Todo 对应一个 child `TodoController`（由 `parentController.makeChild(task)` 创建）。
	 * 渲染结构：
	 * ```
	 * Todo
	 * ├── TodoItem（标题编辑 + 事件指示 + 笔记）
	 * │   ├── overlay: CollapseButton（折叠/展开，仅有子项时显示）
	 * │   └── handle: Handle（拖拽手柄 + 右键菜单）
	 * └── TodoList（子列表，递归渲染，受折叠状态控制）
	 * ```
	 *
	 * **拖拽遮罩**：当 `meDragging` 为 true 时（自身拖拽或同 taskId 的其他实例拖拽），
	 * 显示半透明遮罩并降低不透明度。
	 *
	 * **高亮**：当 `focusActions.highlighting` 为 true 时，显示金色闪烁覆盖层（3秒），
	 * 用于 Week→Todo 焦点定位。
	 *
	 * @prop task - 子任务实体
	 * @prop parentController - 父 TodoController
	 */
	import CollapseIcon from "./item/overlay/CollapseButton.svelte";
	import * as ContextMenu from "$lib/components/ui/context-menu";
	import Handle from "./item/overlay/Handle.svelte";
	import TodoItem from "./item/TodoItem.svelte";
	import TodoList from "./TodoList.svelte";
	import type { TodoController } from "./controller/TodoController.svelte";
	import type { Task } from "$lib/states/meta/task.svelte";
	import { eventbus, type Events } from "./controller/eventbus.svelte";

	interface Props {
		task: Task;
		parentController: TodoController;
		// controller: TodoController;
	}

	let {
		task,
		parentController,
		// controller
	}: Props = $props();
	const controller = parentController.makeChild(task);

	let rootElement: HTMLDivElement;

	let note = $derived(controller.task.$note);
	let isCompleted = $derived(controller.task.isCompleted);

	/** 委托 focusActions 执行滚动 (Action 类不持有 DOM 引用) */
	controller.focusActions.onScrollIntoView = () => {
		rootElement.scrollIntoView({ behavior: "smooth", block: "center" });
	};

	let sameTaskIdOtherTaskDragging = $state(false);
	const sameTaskIdOtherTaskStartDragging = (event: Events["drag:start"]) => {
		if (event.task.id === controller.task.id) {
			sameTaskIdOtherTaskDragging = true;
		}
	};
	$effect(() => {
		eventbus.on("drag:start", sameTaskIdOtherTaskStartDragging);
		return () => {
			eventbus.off("drag:start", sameTaskIdOtherTaskStartDragging);
		};
	});

	const sameTaskIdOtherTaskEndDragging = (event: Events["drag:end"]) => {
		if (event.task.id === controller.task.id) {
			sameTaskIdOtherTaskDragging = false;
		}
	};
	$effect(() => {
		eventbus.on("drag:end", sameTaskIdOtherTaskEndDragging);
		return () => {
			eventbus.off("drag:end", sameTaskIdOtherTaskEndDragging);
		};
	});

	let meDragging = $derived(
		controller.dragDropActions.$isMeDragging || sameTaskIdOtherTaskDragging,
	);

	const children = controller.task.children;
	const hasChildren = $derived(children.size > 0);

	$effect(() => {
		controller.onTodoReady();
		return () => {
			controller.destroy();
		};
	});
</script>

<div
	bind:this={rootElement}
	class:highlight-box={controller.focusActions.highlighting}
	style:view-transition-name={controller.transitionActions
		.$todoViewTransitionName}
	class=" relative flex flex-col ${meDragging ? '  opacity-35 ' : ''}"
>
	<TodoItem {controller}>
		{#snippet handle()}
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					<Handle
						onmousedown={(event) => {
							if (event.button === 0) {
								controller.dragDropActions.$isMeDragging = true;
							}
						}}
						ondragstart={(event) => {
							// event.preventDefault();
							console.log("drag start");
							// event.dataTransfer.effectAllowed = "move";
							controller.dragDropActions.startDrag();
						}}
						ondragend={(event) => {
							event.preventDefault();
							console.log("drag end");
							controller.dragDropActions.endDrag();
						}}
						taskId={controller.task.id}
						onclick={() => controller.zoomInto()}
					/>
				</ContextMenu.Trigger>
				<ContextMenu.Content>
					<ContextMenu.Item
						class="text-red-500"
						onclick={() => controller.deleteMyself()}
					>
						删除
					</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/snippet}

		{#snippet overlay()}
			{#if !meDragging && hasChildren}
				<CollapseIcon
					bind:folded={controller.statesTree.$folded}
					onfolded={() => console.log("folded")}
					onunfolded={() => console.log("unfolded")}
				/>
			{/if}
		{/snippet}
	</TodoItem>

	<TodoList {controller}>
		{#snippet side()}
			<div
				class=" {controller.task.$note.length > 0
					? ' -mt-8'
					: ''} group flex w-5 flex-shrink-0 flex-row items-start pb-0 pl-1"
			>
				<div
					class=" h-full bg-zinc-100 group-hover:bg-zinc-300 transition-colors duration-300"
					style="width: 1px;"
				></div>
			</div>
		{/snippet}
	</TodoList>

	{#if meDragging}
		<!-- dragging mask -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			style:pointer-events="none"
			class=" dragging absolute -ml-2 z-50 h-full w-full rounded-md bg-zinc-500 opacity-0 transition duration-100"
		></div>
	{/if}
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scaleX(0);
		}
		to {
			opacity: 0.3;
			transform: scaleX(1);
		}
	}
	.dragging {
		opacity: 0; /* 初始状态为透明 */
		transform: scaleX(0);
		transform-origin: top left; /* 设置缩放原点为左上角 */
		animation: fadeIn 150ms ease-out forwards; /* 动画持续300毫秒，并保持最终状态 */
	}

	/* 使用伪元素创建高亮层 */
	.highlight-box::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 8px;
		background-color: rgba(255, 215, 0, 0.3);
		animation: blink 3s infinite;
		z-index: 1;
		pointer-events: none;
	}

	/* 定义闪烁动画 */
	@keyframes blink {
		0% {
			opacity: 0;
		}

		20% {
			opacity: 1;
		}

		60% {
			opacity: 1;
		}

		100% {
			opacity: 0;
		}
	}
</style>
