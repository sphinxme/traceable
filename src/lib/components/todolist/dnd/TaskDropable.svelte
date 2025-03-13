<script lang="ts">
	import { getContext } from "svelte";
	import {
		droppable,
		type DroppableActionParams,
	} from "$lib/components/dnd/droppable";
	import type { TaskDnDData } from "./state";
	import { dragging } from "$lib/components/dnd/state";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";

	interface Props {
		parent: TaskProxy;
		index: number;
		topTaskId?: string | undefined;
		bottomTaskId?: string | undefined;
		depth?: number;
		panelId?: any;
		hovering?: boolean;
	}

	let {
		parent,
		index,
		topTaskId = undefined,
		bottomTaskId = undefined,
		depth = 1,
		panelId = getContext("panelId"),
		hovering = $bindable(false),
	}: Props = $props();

	const droppableOptions: DroppableActionParams<TaskDnDData> = {
		channel: "tasks",
		onMove({ draggingTask, originParentTask }) {
			if (index < 0) {
				throw new Error(`invalid index:${index}`);
			}

			// 在同一个parent内move, 仅调换位置
			if (parent.id === originParentTask.id) {
				parent.children.move(draggingTask.id, index);
			} else {
				originParentTask.detachChild(draggingTask);
				parent.attachChild(draggingTask, index);
			}
		},
		onLink({ draggingTask }) {
			parent.attachChild(draggingTask, index);
		},
		droppable(hotKey, { draggingTask, originPanelId, originParentTask }) {
			// 1. 如果是上一个或者下一个的同一个task, 就不能走
			if (
				draggingTask.id == topTaskId ||
				draggingTask.id == bottomTaskId // FIMXE:只有一个方向的不能放?
			) {
				return;
			}

			// 2. 如果是同panel 就move, 如果是不同panel, 就link
			const isSamePanel = originPanelId == panelId;
			let shouldMove = isSamePanel;
			if (hotKey) {
				shouldMove = !shouldMove;
			}
			return shouldMove ? "move" : "link";
		},

		setHoverStatus: (status) => (hovering = status),
		getHoverStatus: () => hovering,
	};
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class=" relative {hovering
		? 'h-2'
		: 'h-0'} transition-height w-full duration-300"
>
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
		content: "";
		height: 4px;
		width: 100%;
		/* left: rem; */
		right: 4px;
		border-radius: 0.5rem;
		background-color: gray;
		opacity: 20%;
	}
</style>
