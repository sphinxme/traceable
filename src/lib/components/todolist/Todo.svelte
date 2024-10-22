<script lang="ts">
	import { getContext, tick } from 'svelte';

	import type { KeyboardHandler } from '../quill/model';
	import CollapseIcon from './item/overlay/CollapseButton.svelte';
	import CheckButton from './item/overlay/CheckButton.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';

	import { draggingTaskId } from './dnd/state';
	import { Database, type TaskProxy } from '$lib/states/rxdb';
	import TaskDraggable from './dnd/TaskDraggable.svelte';
	import Handle from './item/overlay/Handle.svelte';
	import TodoItem from './item/TodoItem.svelte';
	import TodoList from './TodoList.svelte';
	import type { Observable } from 'rxjs';

	let todoItem: TodoItem;
	let todoList: TodoList;

	// export let parentTaskId: string;
	export let parent: Observable<TaskProxy>;
	export let task: Observable<TaskProxy>;
	let db: Database = getContext('db');

	export let currentPath: Observable<TaskProxy>[];
	export let location: { id: string; index: number }[];
	export let depth = 1;
	export let isLastOne = true;

	const focusByLocationFromTop: (paths: { id: string; index: number }[]) => void =
		getContext('focusByLocation');

	export let arrowUpHandle: KeyboardHandler;
	export let arrowDownHandle: KeyboardHandler;
	export let insertBeforeMyself: (text: string) => boolean;
	export let insertAfterMyself: (text: string) => boolean;
	export let tabHandle: () => boolean;
	export let untabHandle: () => boolean;
	export let movedUp: (childTaskId: string) => boolean;

	export const focus = (index: number) => todoItem.focus(index);
	export const focusBottom = (index: number) => {
		if (!folded && todoList.hasChildren()) {
			todoList.focusBottom(index);
		} else {
			todoItem.focus(index);
		}
	};
	export const addChild = (seq: number) => $task.addChild(seq);
	console.log(`${$task.id} reloading`);
	export const moveInto = (seq: number, childId: string) => {
		$task.moveInto(seq, childId);
		console.log(`${childId} move into ${$task.id}`);
		setTimeout(() => {
			focusByLocationFromTop([...location, { index: seq, id: childId }]);
			// todoList.focusBottom(0); // FIXME:整个组件reload, 导致focus失效
		}, 100);
	};
	export const foucsIntoByLocation = (paths: { id: string; index: number }[]) => {
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

	const paths = getContext('paths') as { push: (subpaths: Observable<TaskProxy>[]) => void }; // TODO:抽出来
	let folded = false;
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
				todoList.insertItem(0, '');
				return false;
			} else {
				// 如果没孩子 让上级在下面加一个空的兄弟
				return insertAfterMyself('');
			}
		}
	};

	let meDragging: boolean;
	$: {
		meDragging = $draggingTaskId == $task.id;
	}

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
		<svelte:fragment slot="handle">
			<ContextMenu.Root>
				<ContextMenu.Trigger
					><TaskDraggable {parent} taskId={$task.id}>
						<Handle taskId={$task.id} on:click={() => paths.push(currentPath)} />
					</TaskDraggable></ContextMenu.Trigger
				>
				<ContextMenu.Content>
					<ContextMenu.Item inset on:click={() => db.deleteTask($task.id, $parent.id)}
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
					<CheckButton isCompleted={$task.isCompleted} on:click={toggleTaskStatus} />
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
			{location}
			depth={depth + 1}
			bind:this={todoList}
			arrowUpHandle={(range, context) => {
				todoItem.focus(range.index);
				return false;
			}}
			{arrowDownHandle}
			parent={task}
			{isLastOne}
			moveUp={movedUp}
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
