<script lang="ts">
	import type { MouseEventHandler } from "svelte/elements";

	interface Props {
		taskId: string;
		onclick: MouseEventHandler<HTMLDivElement>;
	}

	let { taskId, onclick }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
	role="button"
	{onclick}
	data-task-id={taskId}
	class="group relative flex items-center justify-center"
>
	<span
		class=" absolute z-0 h-5 w-5 rounded-full bg-slate-200 opacity-0 transition-opacity duration-100 ease-in group-hover:opacity-100"
	></span>
	<span class={` z-10 h-2 w-2 rounded-full bg-slate-500`}></span>
</div>
