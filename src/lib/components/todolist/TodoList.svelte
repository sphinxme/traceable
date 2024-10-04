<script lang="ts">
	import { Database } from '$lib/states/db';
	// import { flip } from 'svelte/animate';
	import { getContext } from 'svelte';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';
	import type { KeyboardHandler } from '../quill/model';
	import Todo from './Todo.svelte';
	import TaskDropable from './dnd/TaskDropable.svelte';
	import { TaskCache as taskCache } from '$lib/states/cache';

	let db: Database = getContext('db');

	export let parentTaskId: string;
	export let currentPath: string[];

	$: itemsQueryResp = db.instant.useQuery({
		taskChildEdges: {
			$: {
				where: { 'parent.id': parentTaskId }
			},
			task: {}
		}
	});

	$: items = ($itemsQueryResp.data?.taskChildEdges || [])
		.map(({ task, seq }) => {
			return task ? { ...task, seq } : undefined;
		})
		.filter((x) => x !== undefined)
		.sort((a, b) => a.seq - b.seq);

	export let depth = 1;
	export let isLastOne = true;

	export let arrowUpHandle: KeyboardHandler = () => true;
	export let arrowDownHandle: KeyboardHandler = () => true;
	export let moveUp: (taskId: string) => boolean = () => true;

	let itemRefs: Record<string, Todo> = {};
	const getIndexedItem = (index: number) => {
		return itemRefs[items.at(index)?.id || ''];
	};

	export const hasChildren = () => {
		return items.length > 0;
	};

	export const focus = (itemIndex: number, cursorIndex: number = 0) => {
		getIndexedItem(itemIndex)?.focus(cursorIndex);
	};

	export const focusTop = (index: number) => {
		getIndexedItem(0)?.focus(index);
	};

	export const focusBottom = (index: number) => {
		getIndexedItem(-1)?.focusBottom(index);
	};

	const now = () => Date.now().valueOf();

	export const insertItem = (i: number, text?: string) => {
		// 在i上面加一个, 加完之后新的item是第i个
		const preSeq = items[i - 1]?.seq || 0;
		const afterSeq = items[i]?.seq || now();
		console.log({ preSeq, afterSeq });
		const seq = (preSeq + afterSeq) / 2;
		db.createTask(parentTaskId, seq, text);
	};

	const moveInto = (childTaskId: string, originParentTaskId: string, index: number) => {
		const newItem = taskCache.get(childTaskId);
		items = [
			...items.slice(0, index),
			{
				seq: 0,
				id: childTaskId,
				textId: newItem?.textId || '',
				noteId: newItem?.noteId || '',
				isCompleted: false
			},
			...items.slice(index)
		];
		taskCache.delete(childTaskId);
		setTimeout(() => {
			db.moveTask(childTaskId, originParentTaskId, parentTaskId, index);
		}, 1000);

		return false;
	};

	const isLastOneEmpty = getContext<LastOneEmptyStatus>(LastOneEmptyStatusKey).isLastOneEmpty;

	$: isMeLastOne = isLastOne && items.length == 0;
	$: if (isMeLastOne) {
		isLastOneEmpty.set(false);
	}
</script>

<div class="flex w-full flex-row">
	<slot name="side"></slot>

	<div class="relative w-full" role="list">
		{#each items as item, i (item.id)}
			<TaskDropable
				{parentTaskId}
				index={i}
				topTaskId={item.id}
				bottomTaskId={items[i - 1]?.id}
				{depth}
			/>
			<Todo
				currentPath={[...currentPath, item.id]}
				depth={depth + 1}
				isLastOne={isLastOne && i == items.length - 1}
				bind:this={itemRefs[item.id]}
				arrowUpHandle={(range, context, quill) => {
					let nextIndex = i - 1;
					if (nextIndex < 0) {
						return arrowUpHandle(range, context, quill); // 到头了
					}
					getIndexedItem(nextIndex).focusBottom(range.index);
					return false;
				}}
				arrowDownHandle={(range, context, quill) => {
					let nextIndex = i + 1;
					if (nextIndex >= items.length) {
						return arrowDownHandle(range, context, quill); // 到头了
					}

					getIndexedItem(nextIndex).focus(range.index);
					return false;
				}}
				insertAfterMyself={(text) => {
					insertItem(i + 1, text);
					setTimeout(() => focus(i + 1), 100);
					return false;
				}}
				insertBeforeMyself={(text) => {
					insertItem(i, text);
					setTimeout(() => focus(i), 100);
					return false;
				}}
				tabHandle={() => {
					if (i === 0) {
						return false;
					}
					db.moveTask(item.id, parentTaskId, items[i - 1].id, Number.MAX_SAFE_INTEGER);
					return false;
				}}
				untabHandle={() => {
					if (depth === 1) {
						return false;
					}
					taskCache.set(item.id, { ...item });
					items.splice(i, 1);
					moveUp(item.id);
					return false;
				}}
				moveUp={(childTaskId) => moveInto(childTaskId, item.id, i + 1)}
				task={item}
				{parentTaskId}
			/>
		{/each}
		<TaskDropable {parentTaskId} index={items.length} topTaskId={items.at(-1)?.id} {depth} />
	</div>
</div>
