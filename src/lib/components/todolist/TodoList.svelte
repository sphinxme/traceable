<script lang="ts">
	import type { KeyboardHandler } from '../quill/model';
	// import { flip } from 'svelte/animate';
	import { getContext, tick } from 'svelte';
	import { Database, type TaskProxy } from '$lib/states/rxdb';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';
	import Todo from './Todo.svelte';
	import TaskDropable from './dnd/TaskDropable.svelte';
	import { firstValueFrom } from 'rxjs';
	import { filterNullish } from '$lib/states/rxdb/utils';
	import type { Observable } from 'rxjs/internal/Observable';

	let db: Database = getContext('db');

	export let parent: Observable<TaskProxy>;
	export let currentPath: Observable<TaskProxy>[];
	export let location: { id: string; index: number }[];
	const focusByLocationFromTop: (paths: { id: string; index: number }[]) => void =
		getContext('focusByLocation');

	$: console.log('parent updating', parent);

	const queryTaskData = async (childId: string) => {
		const result = db.tasks.findById(childId).$.pipe(filterNullish());

		const t = await firstValueFrom(result);
		result.subscribe((ttt) => {
			console.log({ ttt }); //TODO:为什么????
		});
		// await new Promise((resolve) => {
		// 	setTimeout(resolve, 1000);
		// });
		return result;
	};

	$: children = $parent.children$;

	export let depth = 1;
	export let isLastOne = true;

	export let arrowUpHandle: KeyboardHandler = () => true;
	export let arrowDownHandle: KeyboardHandler = () => true;
	export let moveUp: (taskId: string) => boolean = () => true;

	let itemRefs: Record<string, Todo> = {};
	const getIndexedItem = (index: number) => {
		return itemRefs[$children.at(index) || ''];
	};

	export const hasChildren = () => {
		return $children.length > 0;
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

	export const insertItem = (i: number, text?: string) => {
		$parent.addChild(i, text);
		setTimeout(() => focus(i), 100);
	};

	export const foucsIntoByLocation = (paths: { id: string; index: number }[]) => {
		const cur = paths.shift();
		if (!cur) {
			return;
		}
		const curId = $children.at(Math.min(cur.index, Math.max($children.length - 1, 0)));
		if (curId !== cur.id) {
			console.log({ children: $children, paths, cur, curId });
			return;
		}
		itemRefs[curId].foucsIntoByLocation(paths);
	};

	const moveInto = (childTaskId: string, originParentTaskId: string, index: number) => {
		$parent.spliceChildren(index, 0, childTaskId);
		setTimeout(() => {
			focusByLocationFromTop([...location, { id: childTaskId, index }]);
		}, 100);
		return false;
	};

	const isLastOneEmpty = getContext<LastOneEmptyStatus>(LastOneEmptyStatusKey).isLastOneEmpty;

	$: isMeLastOne = isLastOne && $children.length == 0;
	$: if (isMeLastOne) {
		isLastOneEmpty.set(false);
	}
</script>

<div class="flex w-full flex-row">
	<slot name="side"></slot>

	<div class="relative w-full" role="list">
		{#each $children as childId, i (childId)}
			{#await queryTaskData(childId)}
				loading...
			{:then child}
				<TaskDropable
					{parent}
					index={i}
					topTaskId={childId}
					bottomTaskId={$children[i - 1]}
					{depth}
				/>
				<Todo
					currentPath={[...currentPath, child]}
					location={[...location, { index: i, id: childId }]}
					depth={depth + 1}
					isLastOne={isLastOne && i == $children.length - 1}
					bind:this={itemRefs[childId]}
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
						if (nextIndex >= $children.length) {
							return arrowDownHandle(range, context, quill); // 到头了
						}

						getIndexedItem(nextIndex).focus(range.index);
						return false;
					}}
					insertAfterMyself={(text) => {
						insertItem(i + 1, text);
						return false;
					}}
					insertBeforeMyself={(text) => {
						insertItem(i, text);
						return false;
					}}
					tabHandle={() => {
						if (i === 0) {
							return false;
						}
						$parent.removeChild(childId);
						getIndexedItem(i - 1).moveInto(Number.MAX_SAFE_INTEGER, childId);
						return false;
					}}
					untabHandle={() => {
						if (depth === 1) {
							return false;
						}

						const upMoved = moveUp(childId);
						if (upMoved === false) {
							$parent.removeChild(childId);
							return false;
						}
						return true;
					}}
					movedUp={(childchildTaskId) => moveInto(childchildTaskId, childId, i + 1)}
					task={child}
					{parent}
				/>
			{/await}
		{/each}
		<TaskDropable {parent} index={$children.length} topTaskId={$children.at(-1)} {depth} />
	</div>
</div>
