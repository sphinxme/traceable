<script lang="ts">
	import CollapseIcon from "./item/overlay/CollapseButton.svelte";
	import * as ContextMenu from "$lib/components/ui/context-menu";
	import Handle from "./item/overlay/Handle.svelte";
	import TodoItem from "./item/TodoItem.svelte";
	import TodoList from "./TodoList.svelte";
	import type { TodoController } from "./controller/TodoController.svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";

	interface Props {
		task: TaskProxy;
		parentController: TodoController;
		// controller: TodoController;
	}

	let {
		task,
		parentController,
		// controller
	}: Props = $props();
	const controller = parentController.makeChild(task);

	let note = controller.task.note$;
	let isCompleted = controller.task.isCompleted$;
	let meDragging = $derived(controller.dragDropActions.$isMeDragging);

	// highlight
	let highlighting = $state(false);
	controller.doHighlight = () => {
		highlighting = true;
		setTimeout(() => (highlighting = false), 3000);
	};
	const children = controller.task.children.$;
	const hasChildren = $derived($children.size > 0);

	$effect(() => {
		controller.onTodoReady();
		return () => {
			controller.destory();
		};
	});
</script>

<div
	class:highlight-box={highlighting}
	style:view-transition-name={controller.transitionActions
		.$todoViewTransitionName}
	class="relative flex flex-col ${meDragging ? '  opacity-35 ' : ''}"
>
	<TodoItem {controller} note={$note}>
		{#snippet handle()}
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
				class=" {$note.length > 0
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
