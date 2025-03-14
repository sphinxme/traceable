<script lang="ts">
	import { onMount, tick } from "svelte";

	import type { KeyboardHandler } from "../quill/model";
	import CollapseIcon from "./item/overlay/CollapseButton.svelte";
	import * as ContextMenu from "$lib/components/ui/context-menu";

	import { draggingTaskId } from "./dnd/state";
	import TaskDraggable from "./dnd/TaskDraggable.svelte";
	import Handle from "./item/overlay/Handle.svelte";
	import TodoItem from "./item/TodoItem.svelte";
	import TodoList from "./TodoList.svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";
	import {
		EditorItemState,
		getParentStateContext,
		loadStateFromContext,
		setStateIntoContext,
	} from "$lib/states/states/panel_states";
	import { getRegisterFromContext } from "$lib/panels/todo/context.svelte";

	// svelte-ignore non_reactive_update
	let todoList: TodoList;
	let todoItem: TodoItem;

	interface Props {
		parent: TaskProxy;
		task: TaskProxy;

		insertBeforeMyself: (text: string) => boolean;
		insertAfterMyself: (text: string) => boolean;

		arrowUpHandle: KeyboardHandler;
		arrowDownHandle: KeyboardHandler;

		tabHandle: (
			child: TaskProxy,
			itemState: EditorItemState,
			cursorIndex: number,
		) => boolean;
		untabHandle: (
			child: TaskProxy,
			itemState: EditorItemState,
			cursorIndex: number,
		) => boolean;
		movedUp: (
			child: TaskProxy,
			itemState: EditorItemState,
			cursorIndex?: number,
		) => boolean;
	}

	let {
		parent,
		task,
		arrowUpHandle,
		arrowDownHandle,
		insertBeforeMyself,
		insertAfterMyself,
		tabHandle,
		untabHandle,
		movedUp,
	}: Props = $props();
	export const id = task.id;

	let parentState = getParentStateContext();
	let itemState = $parentState.loadChild(task).$;
	$inspect($itemState).with((type, value) => {
		console.log({ type, value });
	});
	setStateIntoContext(itemState);
	let container: HTMLDivElement; // bind

	// const itemState = loadStateFromContext(task).$;

	const hasChildren = () => !$itemState.folded && todoList.hasChildren();
	const itemArrowDownHandle: KeyboardHandler = (range, context, quill) => {
		if (!$itemState.folded && todoList.hasChildren()) {
			todoList.focusTop(range.index);
			return false;
		}
		return arrowDownHandle(range, context, quill);
	};
	const itemEnterHandler: KeyboardHandler = (range, context, quill) => {
		// (后续todo, 模仿幕布行为: 如果是截断的, 那就把光标前面的插入为同级上面; 如果是没截断的, 就加入为孩子中的第一个 )
		// const { index, length } = range;

		if (context.suffix.length) {
			// 如果是截断的: 让上级在前面加一个同级的兄弟, 内容为光标前面的内容
			quill.setText(context.suffix);
			const result = insertBeforeMyself(context.prefix);
			// setTimeout(() => todoItem.focus(0), 100);
			return result;
		} else {
			// 如果不是截断的 是在末尾的
			if (hasChildren()) {
				// 如果有孩子 在下层顶端插入一个空的孩子
				todoList.insertItem(0, "");
				return false;
			} else {
				// 如果没孩子 让上级在下面加一个空的兄弟
				return insertAfterMyself("");
			}
		}
	};

	let hasNote: boolean = $state(false);
	let meDragging: boolean = $derived($draggingTaskId == task.id);

	export const focus = (index: number) => todoItem.focus(index);
	export const focusBottom = (index: number) => {
		if (!$itemState.folded && todoList.hasChildren()) {
			todoList.focusBottom(index);
		} else {
			todoItem.focus(index);
		}
	};
	export const moveInto = (
		seq: number,
		child: TaskProxy,
		childState?: EditorItemState | undefined,
		cursorIndex?: number,
	) => {
		todoList.moveInto(child, seq, childState, cursorIndex);
	};
	let highlighting = $state(false);
	export const foucsIntoByLocation = (
		paths: TaskProxy[],
		index: number = 0,
		highlight: boolean = false,
	) => {
		if (!paths.length) {
			if (highlight) {
				tick().then(() => {
					setTimeout(() => {
						container.scrollIntoView({
							behavior: "smooth",
							inline: "start",
							block: "center",
						});

						highlighting = true;
						setTimeout(() => {
							highlighting = false;
						}, 3000);
					}, 300);
				});
			} else {
				focus(index);
			}
			return;
		}
		if ($itemState.folded) {
			$itemState.folded = false;
			tick().then(() => {
				todoList.foucsIntoByLocation(paths, index, highlight);
			});
		} else {
			todoList.foucsIntoByLocation(paths, index, highlight);
		}
	};

	// 方便highlight
	const register = getRegisterFromContext();
	onMount(() => {
		return register($itemState);
	});
</script>

<div
	bind:this={container}
	class:highlight-box={highlighting}
	class="relative flex flex-col ${meDragging ? '  opacity-35 ' : ''}"
>
	<TodoItem
		bind:this={todoItem}
		bind:hasNote
		arrowDownHandle={itemArrowDownHandle}
		{arrowUpHandle}
		enterHandle={itemEnterHandler}
		{task}
		tabHandle={(range: { index: number }) => {
			tabHandle(task, $itemState, range.index);
		}}
		untabHandle={(range: { index: number }) => {
			untabHandle(task, $itemState, range.index);
		}}
	>
		{#snippet handle()}
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					<TaskDraggable {parent} {task}>
						<Handle
							taskId={task.id}
							onclick={() => $itemState.zoomIn()}
						/>
					</TaskDraggable>
				</ContextMenu.Trigger>
				<ContextMenu.Content>
					<ContextMenu.Item
						class="z-50"
						inset
						onclick={() => parent.deleteChild(task)}
					>
						删除
					</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/snippet}

		{#snippet overlay()}
			{#if !meDragging}
				<CollapseIcon
					bind:folded={$itemState.folded}
					onfolded={() => console.log("folded")}
					onunfolded={() => console.log("unfolded")}
				/>
			{/if}
		{/snippet}
	</TodoItem>

	<TodoList
		display={!$itemState.folded}
		bind:this={todoList}
		arrowUpHandle={(range, context) => {
			todoItem.focus(range.index);
			return false;
		}}
		{arrowDownHandle}
		parent={task}
		moveUp={movedUp}
	>
		{#snippet side()}
			<div
				class=" {hasNote
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
