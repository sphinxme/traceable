<script lang="ts">
	import type { KeyboardHandler } from "../quill/model";
	import type { Snippet } from "svelte";
	// import { flip } from 'svelte/animate';
	import { getContext } from "svelte";

	import Todo from "./Todo.svelte";
	import TaskDropable from "./dnd/TaskDropable.svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";
	import {
		EditorItemState,
		getParentStateContext,
	} from "$lib/states/states/panel_states";
	import { fly, slide } from "svelte/transition";
	import { bounceInOut, expoOut } from "svelte/easing";

	interface Props {
		parent: TaskProxy;
		arrowUpHandle?: KeyboardHandler;
		arrowDownHandle?: KeyboardHandler;
		moveUp?: (
			child: TaskProxy,
			childState: EditorItemState,
			cursorIndex?: number,
		) => boolean;
		side?: Snippet;
		display: boolean;
		viewTransitionName?: string;
	}

	let {
		parent,
		arrowUpHandle = () => true,
		arrowDownHandle = () => true,
		moveUp = () => true,
		side,
		display,
		viewTransitionName,
	}: Props = $props();

	let parentState = getParentStateContext();
	let depth = $derived($parentState.depth);
	let container: HTMLDivElement;

	const focusByLocationFromTop: (
		paths: TaskProxy[],
		cursorIndex?: number,
	) => void = getContext("focusByLocation");

	let children = $derived(parent.children.$);
	const getIndexedItem = (index: number) => {
		// itemRefs如果unbind之后, 不会减少长度, 而是会留下null元素, 所以需要filter一下
		return itemRefs.filter((x) => x != null).at(index);
	};

	let itemRefs: Todo[] = $state([]);

	export const hasChildren = () => {
		return parent.hasChildren();
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
		parent.insertChild(i, text);
		if (focusToNew) {
			setTimeout(() => focus(i, text?.length), 100);
		}
	};

	export const foucsIntoByLocation = (
		paths: TaskProxy[],
		index?: number,
		highlight: boolean = false,
	) => {
		const cur = paths.shift();
		if (!cur) {
			return;
		}
		itemRefs
			.filter((x) => x != null)
			.find((x) => x.id === cur.id)
			?.foucsIntoByLocation(paths, index, highlight);
	};

	export const moveInto = (
		child: TaskProxy,
		index: number,
		childState: EditorItemState | undefined,
		cursorIndex?: number,
	) => {
		$parentState.moveInto(childState);
		parent.attachChild(child, index);
		setTimeout(() => {
			focusByLocationFromTop(
				[...$parentState.absolutePaths, child],
				cursorIndex,
			);
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

<div
	bind:this={container}
	style:view-transition-name={viewTransitionName}
	class="flex w-full flex-row"
	style:display={display ? "" : "none"}
>
	{@render side?.()}

	{#key $children}
		<div class="relative w-full" role="list">
			{#each $children as child, i (child.id)}
				<div
					in:fly={{ easing: expoOut, x: -10, duration: 700 }}
					out:slide={{
						easing: expoOut,
						axis: "y",
						duration: 700,
					}}
				>
					<TaskDropable
						{parent}
						index={i}
						topTaskId={child.id}
						bottomTaskId={$children.get(i - 1)?.id}
						{depth}
					/>

					<Todo
						bind:this={itemRefs[i]}
						arrowUpHandle={(range, context, quill) => {
							let preIndex = i - 1;
							if (preIndex < 0) {
								return arrowUpHandle(range, context, quill); // 到头了
							}
							getIndexedItem(preIndex)?.focusBottom(range.index);
							return false;
						}}
						arrowDownHandle={(range, context, quill) => {
							let nextIndex = i + 1;
							if (nextIndex >= $children.size) {
								return arrowDownHandle(range, context, quill); // 到头了
							}

							getIndexedItem(nextIndex)?.focus(range.index);
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
						tabHandle={(child, childState, cursorIndex) => {
							if (i === 0) {
								return false;
							}
							parent.detachChild(child);
							getIndexedItem(i - 1)?.moveInto(
								Number.MAX_SAFE_INTEGER,
								child,
								childState,
								cursorIndex,
							);
							return false;
						}}
						untabHandle={(child, childState, cursorIndex) => {
							if (depth === 0) {
								return false;
							}
							const upMoved = !moveUp(
								child,
								childState,
								cursorIndex,
							);
							if (upMoved) {
								parent.detachChild(child);
								return false;
							}
							return true;
						}}
						movedUp={(child, childState, cursorIndex) =>
							moveInto(child, i + 1, childState, cursorIndex)}
						task={child}
						{parent}
					/>
				</div>
			{/each}

			<TaskDropable
				{parent}
				index={$children.size}
				topTaskId={$children.getId($children.size - 1)}
				{depth}
			/>
		</div>
	{/key}
</div>
