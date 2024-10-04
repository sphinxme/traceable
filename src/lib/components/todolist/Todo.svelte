<script lang="ts">
	import TodoItem from './item/TodoItem.svelte';
	import TodoList from './TodoList.svelte';
	import { Database } from '$lib/states/db';
	import type { KeyboardHandler } from '../quill/model';
	import CollapseIcon from './item/overlay/CollapseButton.svelte';
	import CheckButton from './item/overlay/CheckButton.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import TaskDraggable from './dnd/TaskDraggable.svelte';
	import { draggingTaskId } from './dnd/state';
	import Handle from './item/overlay/Handle.svelte';
	import { getContext } from 'svelte';

	let todoItem: TodoItem;
	let todoList: TodoList;

	export let parentTaskId: string;
	export let task: {
		id: string;
		isCompleted: boolean;
		noteId: string;
		textId: string;
	};
	let db: Database = getContext('db');

	export let currentPath: string[];
	export let depth = 1;
	export let isLastOne = true;

	export let arrowUpHandle: KeyboardHandler;
	export let arrowDownHandle: KeyboardHandler;
	export let insertBeforeMyself: (text: string) => boolean;
	export let insertAfterMyself: (text: string) => boolean;
	export let tabHandle: () => boolean;
	export let untabHandle: () => boolean;
	export let moveUp: (childTaskId: string) => boolean;

	export const focus = (index: number) => todoItem.focus(index);
	export const focusBottom = (index: number) => {
		if (!folded && todoList.hasChildren()) {
			todoList.focusBottom(index);
		} else {
			todoItem.focus(index);
		}
	};

	const paths = getContext('paths') as any;
	let parentEdgesQuery = db.instant.useQuery({
		taskChildEdges: {
			$: { where: { 'task.id': task.id } }
		}
	});
	if ($parentEdgesQuery.error) {
		throw new Error($parentEdgesQuery.error.message);
	}
	$: multiParent = ($parentEdgesQuery.data?.taskChildEdges || []).length > 1;
	let folded = multiParent;
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
			setTimeout(() => todoItem.focus(0), 100);
			return result;
		} else {
			// 如果不是截断的 是在末尾的
			if (hasChildren()) {
				// 如果有孩子 在下层顶端插入一个空的孩子
				todoList.insertItem(0, '');
				setTimeout(() => todoList.focusTop(0), 100);
				return false;
			} else {
				// 如果没孩子 让上级在下面加一个空的兄弟
				return insertAfterMyself('');
			}
		}
	};

	// const tabHandle = () => {
	// 	// 把自己作为自己上面兄弟的孩子

	// 	// db.moveTask(task.id, parentTaskId, t, Number.MAX_SAFE_INTEGER)
	// 	return false;
	// };

	// const untabHandle = () => {
	// 	console.log('untab');
	// 	return false;
	// };

	let meDragging: boolean;
	$: {
		meDragging = $draggingTaskId == task.id;
	}

	const toggleTaskStatus = () => {
		db.instant.transact([db.instant.tx.tasks[task.id].update({ isCompleted: !task.isCompleted })]);
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
		<svelte:fragment slot="handle">
			<ContextMenu.Root>
				<ContextMenu.Trigger
					><TaskDraggable {parentTaskId} taskId={task.id}>
						<Handle
							{multiParent}
							taskId={task.id}
							on:click={() => {
								console.log('mmp');
								paths.push(currentPath);
							}}
						/>
					</TaskDraggable></ContextMenu.Trigger
				>
				<ContextMenu.Content>
					<ContextMenu.Item inset on:click={() => db.deleteTask(task.id, parentTaskId)}
						>删除</ContextMenu.Item
					>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</svelte:fragment>

		<svelte:fragment slot="overlay">
			{#if !meDragging}
				<div
					class="flex flex-row items-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
				>
					<!-- <ItemMenuButton on:delete={() => db.deleteTask(task.id, parentTaskId)} /> -->
					<CheckButton isCompleted={task.isCompleted} on:click={toggleTaskStatus} />
				</div>
				<CollapseIcon
					bind:folded
					on:folded={() => console.log('folded')}
					on:unfolded={() => console.log('unfolded')}
				/>
			{/if}
		</svelte:fragment>
	</TodoItem>

	{#if !folded}
		<TodoList
			{currentPath}
			depth={depth + 1}
			bind:this={todoList}
			arrowUpHandle={(range, context) => {
				todoItem.focus(range.index);
				return false;
			}}
			{arrowDownHandle}
			parentTaskId={task.id}
			{isLastOne}
			{moveUp}
		>
			<div slot="side" class="flex w-9 flex-row items-start pb-0 pl-1">
				<div class=" h-full bg-slate-300" style="width: 1px;"></div>
			</div>
		</TodoList>
	{/if}

	{#if meDragging}
		<!-- dragging mask -->
		<div
			class=" absolute z-50 ml-5 h-full w-full rounded-md bg-slate-500 opacity-0 transition duration-100"
			class:opacity-30={meDragging}
		/>
	{/if}
</div>
