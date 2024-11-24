<script lang="ts">
	import { getContext, tick } from "svelte";

	import type { KeyboardHandler } from "../quill/model";
	import CollapseIcon from "./item/overlay/CollapseButton.svelte";
	import CheckButton from "./item/overlay/CheckButton.svelte";
	import * as ContextMenu from "$lib/components/ui/context-menu";

	import { draggingTaskId } from "./dnd/state";
	import { Database, type TaskProxy } from "$lib/states/rxdb";
	import TaskDraggable from "./dnd/TaskDraggable.svelte";
	import Handle from "./item/overlay/Handle.svelte";
	import TodoItem from "./item/TodoItem.svelte";
	import TodoList from "./TodoList.svelte";
	import type { Observable } from "rxjs";

	// svelte-ignore non_reactive_update
	let todoList: TodoList;
	let todoItem: TodoItem;
	let db: Database = getContext("db");
	const focusByLocationFromTop: (
		paths: { id: string; index: number }[],
	) => void = getContext("focusByLocation");
	const paths: { push: (subpaths: Observable<TaskProxy>[]) => void } =
		getContext("paths"); // TODO:抽出来

	interface Props {
		parent: Observable<TaskProxy>;
		task: Observable<TaskProxy>;
		currentPath: Observable<TaskProxy>[];
		location: { id: string; index: number }[];
		depth?: number;
		arrowUpHandle: KeyboardHandler;
		arrowDownHandle: KeyboardHandler;
		insertBeforeMyself: (text: string) => boolean;
		insertAfterMyself: (text: string) => boolean;
		tabHandle: () => boolean;
		untabHandle: () => boolean;
		movedUp: (childTaskId: string) => boolean;
	}

	let {
		parent,
		task,
		currentPath,
		location,
		depth = 1,
		arrowUpHandle,
		arrowDownHandle,
		insertBeforeMyself,
		insertAfterMyself,
		tabHandle,
		untabHandle,
		movedUp,
	}: Props = $props();

	export const focus = (index: number) => todoItem.focus(index);
	export const focusBottom = (index: number) => {
		if (!folded && todoList.hasChildren()) {
			todoList.focusBottom(index);
		} else {
			todoItem.focus(index);
		}
	};
	export const addChild = (seq: number) => $task.addChild(seq);
	export const moveInto = (seq: number, childId: string) => {
		$task.moveInto(seq, childId);
		console.log(`${childId} move into ${$task.id}`);
		setTimeout(() => {
			focusByLocationFromTop([...location, { index: seq, id: childId }]);
			// todoList.focusBottom(0); // FIXME:整个组件reload, 导致focus失效
		}, 100);
	};
	export const foucsIntoByLocation = (
		paths: { id: string; index: number }[],
	) => {
		if (!paths.length) {
			focus(0);
			return;
		}
		if (folded) {
			folded = false;
			tick().then(() => {
				todoList.foucsIntoByLocation(paths);
			});
		} else {
			todoList.foucsIntoByLocation(paths);
		}
	};

	let folded = $state(false);
	const hasChildren = () => !folded && todoList.hasChildren();
	const itemArrowDownHandle: KeyboardHandler = (range, context, quill) => {
		if (!folded && todoList.hasChildren()) {
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

	let meDragging: boolean = $derived($draggingTaskId == $task.id);
	const toggleTaskStatus = () => {
		$task.patch({ isCompleted: !$task.isCompleted });
	};
</script>

<div class="relative flex flex-col ${meDragging ? '  opacity-35 ' : ''}">
	<TodoItem
		bind:this={todoItem}
		arrowDownHandle={itemArrowDownHandle}
		{arrowUpHandle}
		enterHandle={itemEnterHandler}
		{task}
		{tabHandle}
		{untabHandle}
	>
		{#snippet handle()}
			<ContextMenu.Root>
				<ContextMenu.Trigger
					><TaskDraggable {parent} taskId={$task.id}>
						<Handle
							taskId={$task.id}
							onclick={() => paths.push(currentPath)}
						/>
					</TaskDraggable></ContextMenu.Trigger
				>
				<ContextMenu.Content>
					<ContextMenu.Item
						inset
						onclick={() => db.deleteTask($task.id, $parent.id)}
						>删除</ContextMenu.Item
					>
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/snippet}

		{#snippet overlay()}
			{#if !meDragging}
				<div
					class="flex flex-row items-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
				>
					<CheckButton
						isCompleted={$task.isCompleted}
						onclick={toggleTaskStatus}
					/>
				</div>
				<CollapseIcon
					bind:folded
					onfolded={() => console.log("folded")}
					onunfolded={() => console.log("unfolded")}
				/>
			{/if}
		{/snippet}
	</TodoItem>

	{#if !folded}
		<TodoList
			{currentPath}
			{location}
			depth={depth + 1}
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
				<div class="flex w-9 flex-row items-start pb-0 pl-1">
					<div class=" h-full bg-slate-300" style="width: 1px;"></div>
				</div>
			{/snippet}
		</TodoList>
	{/if}

	{#if meDragging}
		<!-- dragging mask -->
		<div
			class=" absolute z-50 ml-5 h-full w-full rounded-md bg-slate-500 opacity-0 transition duration-100"
			class:opacity-30={meDragging}
		></div>
	{/if}
</div>
