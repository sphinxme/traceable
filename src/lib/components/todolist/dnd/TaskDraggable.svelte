<script lang="ts">
	import {
		draggable,
		type DraggableActionParams,
	} from "$lib/components/dnd/draggable";
	import { draggingTaskId, type TaskDnDData } from "./state";
	import { getContext } from "svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";

	const panelId: string = getContext("panelId");

	let dragOpts: DraggableActionParams<TaskDnDData> = {
		channel: "tasks",
		onDragStart() {
			draggingTaskId.set(task.id);
			meDragging = true;
			return {
				originPanelId: panelId,
				draggingTask: task,
				originParentTask: parent,
			};
		},
		onDragEnd() {
			draggingTaskId.set("");
			meDragging = false;
		},
	};

	interface Props {
		task: TaskProxy;
		parent: TaskProxy;
		meDragging?: boolean;
		class?: string | undefined;
		children?: import("svelte").Snippet;
	}

	let {
		task,
		parent,
		meDragging = $bindable(false),
		class: classes = undefined,
		children,
	}: Props = $props();
</script>

<div
	style="overflow: visible;"
	class={classes}
	use:draggable={dragOpts}
	style:opacity={meDragging ? "100" : "100"}
>
	{@render children?.()}
</div>
