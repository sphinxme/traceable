<script lang="ts">
	import { getContext } from 'svelte';
	import { droppable, type DroppableActionParams } from '$lib/components/dnd/droppable';
	import type { TaskDnDData } from './state';
	import { dragging } from '$lib/components/dnd/state';
	import { type TaskProxy } from '$lib/states/rxdb';
	import type { Observable } from 'rxjs';

	export let parent: Observable<TaskProxy>;
	export let index: number;

	export let topTaskId: string | undefined = undefined;
	export let bottomTaskId: string | undefined = undefined;

	export let depth = 1;
	export let panelId = getContext('panelId');

	export let hovering = false;

	const droppableOptions: DroppableActionParams<TaskDnDData> = {
		channel: 'tasks',
		onMove({ draggingTaskId, originParentTask }) {
			if (index < 0) {
				throw new Error(`invalid index:${index}`);
			}

			// 在同一个parent内move, 仅调换位置
			if ($parent.id === originParentTask.id) {
				const originIndex = $parent.children.indexOf(draggingTaskId);
				if ($parent.children.indexOf(draggingTaskId) === index) {
					// FIXME:如果是+1的位置 也可能是没动的
					return;
				}

				let children = [...$parent.children];
				children.splice(originIndex, 1);
				console.log({ index, originIndex, children, draggingTaskId });
				children.splice(Math.min(index, children.length), 0, draggingTaskId);
				$parent.patch({ children });
			} else {
				// 1.删除原来的边(只删边)
				originParentTask.removeChild(draggingTaskId);
				// 2.加新的边
				$parent.spliceChildren(index, 0, draggingTaskId);
			}
		},
		onLink({ draggingTaskId }) {
			console.log('on task link');
			$parent.spliceChildren(index, 0, draggingTaskId);
		},
		droppable(hotKey, { draggingTaskId, originPanelId, originParentTask }) {
			// 1. 如果是上一个或者下一个的同一个task, 就不能走
			if (draggingTaskId == topTaskId || draggingTaskId == bottomTaskId) {
				return;
			}

			// 2. 如果是同panel 就move, 如果是不同panel, 就link
			const isSamePanel = originPanelId == panelId;
			let shouldMove = isSamePanel;
			if (hotKey) {
				shouldMove = !shouldMove;
				console.log({ shouldMove });
				console.log(shouldMove ? 'move' : 'link');
			}
			return shouldMove ? 'move' : 'link';
		},

		setHoverStatus: (status) => (hovering = status),
		getHoverStatus: () => hovering
	};
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class=" relative {hovering ? 'h-2' : 'h-0'} transition-height w-full duration-300">
	<!-- 拖拽检测区域(超出上方的relative范围) -->
	{#if true || $dragging}
		<div
			class:hovering
			class=" absolute -bottom-1.5 -top-3 flex w-full flex-col items-center justify-center"
			use:droppable={droppableOptions}
			style:z-index={depth}
		></div>
	{/if}
</div>

<style>
	/* 指示器 */
	.hovering::after {
		position: absolute;
		content: '';
		height: 4px;
		width: 100%;
		/* left: rem; */
		right: 4px;
		border-radius: 0.5rem;
		background-color: gray;
		opacity: 20%;
	}
</style>
