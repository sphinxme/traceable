<script lang="ts">
	import TodoItem from './item/TodoItem.svelte';
	import type Quill from 'quill';
	import type { Range } from 'quill';
	import type { Context } from 'quill/modules/keyboard';
	import TodoList from './TodoList.svelte';
	import * as Y from 'yjs';
	import { Database } from '$lib/states/data';
	import type { KeyboardHandler } from './item/model';
	import CollapseIcon from './item/overlay/CollapseButton.svelte';
	import { slide } from 'svelte/transition';
	import CheckButton from './item/overlay/CheckButton.svelte';
	import ItemMenuButton from './item/overlay/ItemMenuButton.svelte';
	import Dropable from './dnd/TaskDropable.svelte';
	import { isCopy } from './dnd';
	import S from 'lucide-static/icons/airplay.svg';
	import { Draggable, ThirdPartyDraggable } from '@fullcalendar/interaction/index.js';
	import { getContext, onMount } from 'svelte';
	import { addControls } from 'quill/modules/toolbar';
	import TaskDraggable from './dnd/TaskDraggable.svelte';
	import TaskDropable from './dnd/TaskDropable.svelte';
	import { draggingTaskId } from './dnd/state';

	let todoItem: TodoItem;
	let todoList: TodoList;

	export let parentTaskId: string;
	export let taskId: string;
	export let indexInParent: number;
	export let db: Database;

	export let depth = 1;
	export let isLastOne = true;

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

	let children = db.getTaskChildren(taskId);
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

	const parentIds = task.get('parentIds') as Y.Array<string>;
	if (parentIds.length > 1) {
		folded = true;
	}

	const itemArrowDownHandle: KeyboardHandler = (range, context, quill) => {
		if (children.length) {
			todoList.focusTop(0);
			return false;
		}
		return arrowDownHandle(range, context, quill);
	};
	const itemEnterHandler: KeyboardHandler = (range, context, quill) => {
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
	};

	let meDragging: boolean;
	$: {
		meDragging = $draggingTaskId == taskId;
	}
</script>

<div class="relative flex flex-col ${meDragging ? '  opacity-35 ' : ''}">
	<TaskDraggable {parentTaskId} {taskId} orginIndex={indexInParent}>
		<TodoItem
			bind:this={todoItem}
			arrowDownHandle={itemArrowDownHandle}
			{arrowUpHandle}
			enterHandle={itemEnterHandler}
			{taskId}
			{db}
			isLastOne={isLastOne && children.length == 0}
		>
			<!-- <svelte:fragment slot="drag">
				{#if !meDragging}
					<TaskDropable {parentTaskId} index={0} {depth} bind:hoverStatus={dropHovering} />
				{/if}
			</svelte:fragment> -->

			<svelte:fragment slot="overlay">
				{#if !meDragging}
					<div
						class="flex flex-row items-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
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
				{/if}
			</svelte:fragment>
		</TodoItem>
	</TaskDraggable>

	{#if !folded}
		<TodoList
			depth={depth + 1}
			bind:this={todoList}
			arrowUpHandle={(range, context) => {
				todoItem.focus(range.index);
				return false;
			}}
			{arrowDownHandle}
			parentTaskId={taskId}
			{isLastOne}
			{db}
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
