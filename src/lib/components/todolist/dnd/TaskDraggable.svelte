<script lang="ts">
	import { draggable, type DraggableActionParams } from '$lib/components/dnd/draggable';
	import type { TaskProxy } from '$lib/states/rxdb';
	import type { Observable } from 'rxjs';
	import { draggingTaskId, type TaskDnDData } from './state';
	import { getContext } from 'svelte';

	const panelId: string = getContext('panelId');


	let dragOpts: DraggableActionParams<TaskDnDData> = {
		channel: 'tasks',
		onDragStart() {
			draggingTaskId.set(taskId);
			meDragging = true;
			return {
				originPanelId: panelId,
				draggingTaskId: taskId,
				originParentTask: $parent
			};
		},
		onDragEnd() {
			draggingTaskId.set('');
			meDragging = false;
		}
	};

	interface Props {
		taskId: string;
		parent: Observable<TaskProxy>;
		meDragging?: boolean;
		class?: string | undefined;
		children?: import('svelte').Snippet;
	}

	let {
		taskId,
		parent,
		meDragging = $bindable(false),
		class: classes = undefined,
		children
	}: Props = $props();
	
</script>

<div
	style="overflow: visible;"
	class={classes}
	use:draggable={dragOpts}
	style:opacity={meDragging ? '100' : '100'}
>
	{@render children?.()}
</div>
