<script lang="ts">
	import TodoItem from './item/TodoItem.svelte';
	import TodoList from './TodoList.svelte';
	import { Database } from '$lib/states/db';
	import type { KeyboardHandler } from './item/model';
	import CollapseIcon from './item/overlay/CollapseButton.svelte';
	import CheckButton from './item/overlay/CheckButton.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import ItemMenuButton from './item/overlay/ItemMenuButton.svelte';
	import TaskDraggable from './dnd/TaskDraggable.svelte';
	import { draggingTaskId } from './dnd/state';
	import Handle from './item/overlay/Handle.svelte';
	import { getContext } from 'svelte';
	import { fade, slide } from 'svelte/transition';

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
	export let enterHandle: KeyboardHandler;

	export const focus = (index: number) => todoItem.focus(index);
	export const focusBottom = (index: number) => {
		console.log('focusBottom');
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
	const itemArrowDownHandle: KeyboardHandler = (range, context, quill) => {
		if (!folded && todoList.hasChildren()) {
			todoList.focusTop(0);
			return false;
		}
		return arrowDownHandle(range, context, quill);
	};
	const itemEnterHandler: KeyboardHandler = (range, context, quill) => {
		// (后续todo, 模仿幕布行为: 如果是截断的, 那就把光标前面的插入为同级上面; 如果是没截断的, 就加入为孩子中的第一个 )
		// 1. 如果item当前有孩子 那么top新建一个孩子
		const { index, length } = range;
		if (!folded && todoList.hasChildren()) {
			todoList.insertItem(0, '');
			return false;
		} else {
			// 2. 如果没有孩子 那么上抛 下层同级创建一个孩子 然后把剩下的截断放到兄弟里
			return enterHandle(range, context, quill);
			// return false;
		}
	};

	let meDragging: boolean;
	$: {
		meDragging = $draggingTaskId == task.id;
	}

	const toggleTaskStatus = () => {
		db.instant.transact([db.instant.tx.tasks[task.id].update({ isCompleted: !task.isCompleted })]);
	};
</script>

<div transition:slide class="relative flex flex-col ${meDragging ? '  opacity-35 ' : ''}">
	<TodoItem
		bind:this={todoItem}
		arrowDownHandle={itemArrowDownHandle}
		{arrowUpHandle}
		enterHandle={itemEnterHandler}
		{task}
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
