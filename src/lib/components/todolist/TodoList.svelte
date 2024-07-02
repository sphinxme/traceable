<script lang="ts">
	import type { Database } from '$lib/states/data';
	import { flip } from 'svelte/animate';
	import * as Y from 'yjs';
	import { getContext, onDestroy } from 'svelte';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';
	import type { KeyboardHandler } from './item/model';
	import Todo from './Todo.svelte';
	import TaskDropable from './dnd/TaskDropable.svelte';
	import { slide } from 'svelte/transition';

	export let db: Database;

	export let parentTaskId: string;

	let items: Y.Array<string> = db.getTaskChildren(parentTaskId);
	let itemsArr = items.toArray();
	const observeItems = () => {
		itemsArr = items.toArray();
	};
	items.observe(observeItems);
	onDestroy(() => {
		items.unobserve(observeItems);
	});

	export let depth = 1;
	export let isLastOne = true;

	export let arrowUpHandle: KeyboardHandler = () => true;
	export let arrowDownHandle: KeyboardHandler = () => true;

	export const focusTop = (index: number) => {
		itemRefs.at(index)?.focus(index);
	};

	export const focusBottom = (index: number) => {
		itemRefs.at(-1)?.focus(index);
	};

	let itemRefs: Todo[] = [];

	const handleArrowUpFromItem: (i: number) => KeyboardHandler = (i) => (range, context, quill) => {
		let nextIndex = i - 1;
		if (nextIndex < 0) {
			return arrowUpHandle(range, context, quill); // 到头了
		}
		itemRefs[nextIndex].focusBottom(range.index);
		return false;
	};
	const handleArrowDownFromItem: (i: number) => KeyboardHandler =
		(i) => (range, context, quill) => {
			let nextIndex = i + 1;
			if (nextIndex >= itemsArr.length) {
				return arrowDownHandle(range, context, quill); // 到头了
			}

			itemRefs[nextIndex].focus(range.index);
			return false;
		};

	const insertItem = (i: number, text?: string) => {
		// 在i下面再加一个
		const id = db.createTask({
			id: '',
			textId: '',
			text: text,
			parentIds: [parentTaskId],
			isCompleted: false
		});
		items.insert(i + 1, [id]);
	};
	const handleEnterFromItem: (i: number) => KeyboardHandler = (i) => (range, context, quill) => {
		// 在i下面再加一个
		insertItem(i, '');
		// FIXME:focus到对应的item里
		setTimeout(() => {
			focusTop(i + 1);
		}, 100);

		return true;
	};

	const isLastOneEmpty = getContext<LastOneEmptyStatus>(LastOneEmptyStatusKey).isLastOneEmpty;

	const isMeLastOne = isLastOne && itemsArr.length == 0;
	$: if (isMeLastOne) {
		isLastOneEmpty.set(false);
	}
</script>

<div class="flex w-full flex-row" transition:slide>
	<slot name="side"></slot>

	<div class="relative w-full" role="list">
		{#if itemsArr.length > 0}
			{#each itemsArr as item, i (item)}
				<TaskDropable
					{parentTaskId}
					index={i}
					topTaskId={item}
					bottomTaskId={itemsArr[i - 1]}
					{depth}
				/>
				<Todo
					depth={depth + 1}
					isLastOne={isLastOne && i == itemsArr.length - 1}
					indexInParent={i}
					bind:this={itemRefs[i]}
					arrowUpHandle={handleArrowUpFromItem(i)}
					arrowDownHandle={handleArrowDownFromItem(i)}
					enterHandle={handleEnterFromItem(i)}
					taskId={item}
					{parentTaskId}
					{db}
				/>
			{/each}
		{/if}
		<TaskDropable {parentTaskId} index={itemsArr.length} topTaskId={itemsArr.at(-1)} {depth} />
	</div>
</div>
