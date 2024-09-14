<script lang="ts">
	import { Database } from '$lib/states/db';
	// import { flip } from 'svelte/animate';
	import { getContext } from 'svelte';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';
	import type { KeyboardHandler } from './item/model';
	import Todo from './Todo.svelte';
	import TaskDropable from './dnd/TaskDropable.svelte';
	import { slide } from 'svelte/transition';

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
	if ($itemsQueryResp?.error) {
		throw new Error($itemsQueryResp.error.message);
	}
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

	let itemRefs: Record<string, Todo> = {};
	const getIndexedItem = (index: number) => {
		return itemRefs[items.at(index)?.id || ''];
	};

	export const hasChildren = () => {
		return items.length > 0;
	};

	export const focusTop = (index: number) => {
		getIndexedItem(index)?.focus(index);
	};

	export const focusBottom = (index: number) => {
		getIndexedItem(-1)?.focus(index);
	};

	const now = () => Date.now().valueOf();

	export const insertItem = (i: number, text?: string) => {
		// 在i下面再加一个
		const preSeq = items[i]?.seq || now();
		const afterSeq = items[i + 1]?.seq || now();
		console.log({ preSeq, afterSeq });
		const seq = (preSeq + afterSeq) / 2;
		db.createTask(parentTaskId, seq);
	};

	const isLastOneEmpty = getContext<LastOneEmptyStatus>(LastOneEmptyStatusKey).isLastOneEmpty;

	$: isMeLastOne = isLastOne && items.length == 0;
	$: if (isMeLastOne) {
		isLastOneEmpty.set(false);
	}
</script>

<div class="flex w-full flex-row pl-4" transition:slide>
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
				enterHandle={(range, context, quill) => {
					// 在i下面再加一个
					insertItem(i, '');
					// FIXME:focus到对应的item里
					setTimeout(() => {
						focusTop(i + 1);
					}, 100);

					return false;
				}}
				task={item}
				{parentTaskId}
			/>
		{/each}
		<TaskDropable {parentTaskId} index={items.length} topTaskId={items.at(-1)?.id} {depth} />
	</div>
</div>
