<script lang="ts">
	import * as Y from "yjs";
	import type { KeyboardHandler } from "../quill/model";
	import type { Snippet } from "svelte";
	// import { flip } from 'svelte/animate';
	import { getContext } from "svelte";
	import { Database, type TaskProxy } from "$lib/states/rxdb";

	import Todo from "./Todo.svelte";
	import TaskDropable from "./dnd/TaskDropable.svelte";
	import { firstValueFrom } from "rxjs";
	import { filterNullish } from "$lib/states/rxdb/utils.svelte";
	import type { Observable } from "rxjs/internal/Observable";
	import type { StateMap } from "$lib/states/rxdb/rxdb";
	import type { PathItem } from "$lib/states/stores.svelte";

	let db: Database = getContext("db");

	interface Props {
		parent: Observable<TaskProxy>;
		currentPath: PathItem[];
		location: { id: string; index: number }[];
		depth?: number;
		isLastOneEmpty?: boolean;
		arrowUpHandle?: KeyboardHandler;
		arrowDownHandle?: KeyboardHandler;
		moveUp?: (taskId: string, childStateMap: StateMap) => boolean;
		side?: Snippet;
		stateMap: StateMap;
		display: boolean;
	}

	let {
		parent,
		currentPath,
		location,
		depth = 1,
		isLastOneEmpty = $bindable(false),
		arrowUpHandle = () => true,
		arrowDownHandle = () => true,
		moveUp = () => true,
		side,
		stateMap,
		display,
	}: Props = $props();

	function getOrNewState(id: string) {
		let state = stateMap.get(id) as StateMap | undefined;
		if (!state) {
			state = new Y.Map();
			stateMap.set(id, state);
		}
		return state;
	}

	const focusByLocationFromTop: (
		paths: { id: string; index: number }[],
	) => void = getContext("focusByLocation");

	const cache = new Map<string, Promise<Observable<TaskProxy>>>();
	const queryTaskData = (childId: string) => {
		if (!cache.has(childId)) {
			const p = new Promise<Observable<TaskProxy>>(
				async (resolve, reject) => {
					const result = db.tasks
						.findById(childId)
						.$.pipe(filterNullish());
					const t = await firstValueFrom(result);
					result.subscribe((ttt) => {}); //TODO:不加这个 就会获取不到值
					resolve(result);
				},
			);
			cache.set(childId, p);
		}
		return cache.get(childId);
	};

	let children = $derived($parent.children$);
	let itemRefs: Record<string, Todo> = $state({});
	const getIndexedItem = (index: number) => {
		return itemRefs[$children.at(index) || ""];
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

	export const insertItem = (
		i: number,
		text?: string,
		focusToNew: boolean = false,
	) => {
		$parent.addChild(i, text);
		if (focusToNew) {
			setTimeout(() => focus(i, text?.length), 100);
		}
	};

	export const foucsIntoByLocation = (
		paths: { id: string; index: number }[],
	) => {
		const cur = paths.shift();
		if (!cur) {
			return;
		}
		const curId = $children.at(
			Math.min(cur.index, Math.max($children.length - 1, 0)),
		);
		if (curId !== cur.id) {
			console.log({ children: $children, paths, cur, curId });
			return;
		}
		itemRefs[curId].foucsIntoByLocation(paths);
	};

	export const moveInto = (
		childTaskId: string,
		index: number,
		childStateMap: StateMap | undefined,
	) => {
		if (childStateMap) {
			stateMap.set(childTaskId, childStateMap.clone());
			const preParentMap = childStateMap.parent as StateMap | undefined;
			if (preParentMap) {
				preParentMap.delete(childTaskId);
			}
		}
		$parent.moveInto(index, childTaskId);
		setTimeout(() => {
			focusByLocationFromTop([...location, { id: childTaskId, index }]);
		}, 100);
		return false;
	};

	// $effect.pre(() => {
	// 	if ($children) {
	// 		const a = document.startViewTransition();
	// 	}
	// });

	// $effect(() => {});
</script>

<div class="flex w-full flex-row" style:display={display ? "" : "none"}>
	{@render side?.()}

	<div class="relative w-full" role="list">
		{#each $children as childId, i (childId)}
			<div>
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
						currentPath={[
							...currentPath,
							{ proxy: child!, id: childId },
						]}
						location={[...location, { index: i, id: childId }]}
						depth={depth + 1}
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
							insertItem(i + 1, text, true);
							return false;
						}}
						insertBeforeMyself={(text) => {
							insertItem(i, text);
							return false;
						}}
						tabHandle={(childStateMap) => {
							if (i === 0) {
								return false;
							}
							$parent.removeChild(childId);
							getIndexedItem(i - 1).moveInto(
								Number.MAX_SAFE_INTEGER,
								childId,
								childStateMap,
							);
							return false;
						}}
						untabHandle={(childStateMap) => {
							if (depth === 1) {
								return false;
							}
							const upMoved = !moveUp(childId, childStateMap);
							if (upMoved) {
								$parent.removeChild(childId);
								return false;
							}
							return true;
						}}
						movedUp={(childchildTaskId, childStateMap) =>
							moveInto(childchildTaskId, i + 1, childStateMap)}
						task={child!}
						{parent}
						stateMap={getOrNewState(childId)}
					/>
				{/await}
			</div>
		{/each}
		<TaskDropable
			{parent}
			index={$children.length}
			topTaskId={$children.at(-1)}
			{depth}
		/>
	</div>
</div>
