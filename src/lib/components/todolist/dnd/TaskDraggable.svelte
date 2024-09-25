<script lang="ts">
	import { draggable, type DraggableActionParams } from '$lib/components/dnd/draggable';
	import { draggingTaskId, type TaskDnDData } from './state';
	import { getContext } from 'svelte';

	const panelId: string = getContext('panelId');
	export let taskId: string;
	export let parentTaskId: string;

	export let meDragging = false;

	let dragOpts: DraggableActionParams<TaskDnDData> = {
		channel: 'tasks',
		onDragStart() {
			draggingTaskId.set(taskId);
			meDragging = true;
			return {
				originPanelId: panelId,
				draggingTaskId: taskId,
				originParentTaskId: parentTaskId
			};
		},
		onDragEnd() {
			draggingTaskId.set('');
			meDragging = false;
		}
	};

	let classes: string | undefined = undefined;
	export { classes as class };
</script>

<div
	style="overflow: visible;"
	class={classes}
	use:draggable={dragOpts}
	style:opacity={meDragging ? '100' : '100'}
>
	<slot></slot>
</div>
