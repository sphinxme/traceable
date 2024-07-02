<script lang="ts">
	import { droppable, type DroppableActionParams } from '$lib/components/dnd/droppable';
	import { dragging } from '$lib/components/dnd/state';
	import type { TaskDnDData } from '$lib/components/todolist/dnd/state';
	import { db } from '$lib/states/data';
	import dayjs from 'dayjs';
	import { getContext } from 'svelte';

	export let start: number;
	export let end: number;
	export let depth: number = 1;

	export let hovering = false;

	const droppableOptions: DroppableActionParams<TaskDnDData> = {
		channel: 'tasks',
		onMove() {
			throw new Error('invalid operation:move on events');
		},
		onLink({ draggingTaskId }) {
			console.log('on link events');
			db.createEvent(
				{
					id: db.genEventId(),
					taskId: draggingTaskId,
					start: start,
					end: end,
					isAllDay: false,
					isCompleted: false
				},
				'calendar'
			);
		},
		droppable(hotKey, { draggingTaskId, originPanelId, originParentTaskId }) {
			console.log('droppable');
			return 'link';
		},

		setHoverStatus: (status) => (hovering = status),
		getHoverStatus: () => hovering
	};
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="h-full w-full">
	<div
		class="h-full w-full"
		class:hovering
		use:droppable={droppableOptions}
		style:z-index={depth}
	></div>
</div>

<style>
	/* 指示器 */
	.hovering {
		height: 100%;
		width: 100%;
		/* left: rem; */
		right: 4px;
		border-radius: 0.5rem;
		background-color: gray;
		opacity: 20%;
	}
</style>
