<script lang="ts">
	import TodoItem from './item/TodoItem.svelte';
	import TodoList from './TodoList.svelte';
	import Overlay from './item/overlay/Overlay.svelte';
	import { Database } from '$lib/states/data';
	import type { KeyboardHandler } from './item/model';
	import CollapseIcon from './item/overlay/CollapseButton.svelte';
	import { slide } from 'svelte/transition';
	import CheckButton from './item/overlay/CheckButton.svelte';
	import ItemMenuButton from './item/overlay/ItemMenuButton.svelte';

	let todoItem: TodoItem;
	let todoList: TodoList;

	export let parentTaskId: string;
	export let taskId: string;
	export let db: Database;

	export let arrowUpHandle: KeyboardHandler;
	export let arrowDownHandle: KeyboardHandler;
	export let enterHandle: KeyboardHandler;

	export const focus = (index: number) => todoItem.focus(index);
	export const focusBottom = (index: number) => {
		if (children.length) {
			todoList.focusBottom(index);
		} else {
			todoItem.focus(index);
		}
	};

	const children = db.getTaskChildren(taskId);
	let folded = false;
	let task = db.getTask(taskId);
	// TODO:与todoItem中重复 记得重构掉
	let isCompleted: boolean = task.get('isCompleted') as boolean;
	task.observe((event, transaction) => {
		const newIsCompleted = event.target.get('isCompleted') as boolean;
		if (isCompleted != newIsCompleted) {
			isCompleted = newIsCompleted;
		}
	});
</script>

<div data-task-id={taskId} class="flex flex-col">
	<div class="todo">
		<TodoItem
			bind:this={todoItem}
			arrowDownHandle={(range, context, quill) => {
				if (children.length) {
					todoList.focusTop(0);
					return false;
				}
				return arrowDownHandle(range, context, quill);
			}}
			{arrowUpHandle}
			enterHandle={(range, context, quill) => {
				console.log({ range, context, quill });
				// 1. 如果item当前有孩子 那么top新建一个孩子 然后把剩下的截断放到孩子里
				const { index, length } = range;
				if (children.length) {
					const id = db.createTask({
						id: '',
						text: ' ',
						textId: '',
						parentIds: [taskId],
						isCompleted: false
					});
					children.unshift([id]);
					//FIXME:focus到新建的task里面去
					setTimeout(() => {
						todoList.focusTop(0);
					}, 100);
					return false;
				} else {
					// 2. 如果没有孩子 那么上抛 下层同级创建一个孩子 然后把剩下的截断放到兄弟里
					enterHandle(range, context, quill);
					return false;
				}
			}}
			{taskId}
			{db}
		>
			<Overlay slot="overlay">
				<div
					class="menu-btn flex flex-row items-center opacity-0 transition-opacity duration-300 ease-out"
				>
					<ItemMenuButton
						{taskId}
						on:delete={() => {
							db.deleteTaskFromParent(taskId, parentTaskId);
						}}
					/>
					<CheckButton
						{isCompleted}
						on:click={() => {
							db.changeTaskStatus(taskId, !isCompleted);
						}}
					/>
				</div>
				<CollapseIcon
					bind:folded
					on:folded={() => console.log('folded')}
					on:unfolded={() => console.log('unfolded')}
				/>
			</Overlay>
		</TodoItem>
	</div>
	{#if children.length && !folded}
		<div class="flex flex-row" transition:slide>
			<div class="flex w-9 flex-row items-start pb-4 pl-1">
				<div class=" h-full bg-slate-300" style="width: 1px;"></div>
			</div>

			<TodoList
				bind:this={todoList}
				arrowUpHandle={(range, context) => {
					todoItem.focus(range.index);
					return false;
				}}
				{arrowDownHandle}
				parentTaskId={taskId}
				items={children}
				{db}
			/>
		</div>
	{/if}
</div>

<style>
	.todo:hover .menu-btn {
		opacity: 100%;
	}
</style>
