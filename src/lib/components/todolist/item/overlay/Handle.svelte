<script lang="ts">
	import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
	import type { MouseEventHandler } from "svelte/elements";
	import { colors } from "./colors";

	interface Props {
		taskId: string;
		status?: "TODO" | "BLOCK" | "DONE";
		onclick: MouseEventHandler<HTMLDivElement>;
	}

	let { taskId, onclick, status = "TODO" }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
	role="button"
	{onclick}
	data-task-id={taskId}
	class="handle relative flex items-center justify-center"
>
	<span
		class=" plate absolute h-5 w-5 rounded-full bg-slate-300 opacity-0 duration-300 group-hover:opacity-60"
		style:z-index="5"
	>
		<div
			class="extra-panel flex transition ease-in-out justify-stretch items-stretch absolute rounded-full bg-slate-300 left-0 h-5 w-0 overflow-hidden duration-300"
			style:z-index="8"
			style:transition-property="width"
		>
			<div class="w-5 flex-shrink-0"></div>
			<div
				class="toggle flex flex-grow justify-stretch items-stretch text-slate-700 font-bold text-xs"
				onclick={(e) => e.stopPropagation()}
			>
				<ToggleGroup.Root type="single">
					<ToggleGroup.Item value="a">TODO</ToggleGroup.Item>
					<ToggleGroup.Item value="b">DONE</ToggleGroup.Item>
					<ToggleGroup.Item value="c">BLOCK</ToggleGroup.Item>
				</ToggleGroup.Root>

				<!-- <div
					class="my-1 px-1 rounded-full bg-slate-500 text-white"
					style:font-size="0.5rem"
					onclick={() => console.log("todo")}
				>
					TODO
				</div>
				<div
					class="my-1 px-1 rounded-full align-middle bg-blue-300"
					style:font-size="0.5rem"
					onclick={() => console.log("block")}
				>
					BLOCK
				</div>
				<div
					class="my-1 px-1 rounded-full bg-slate-100"
					style:font-size="0.5rem"
					onclick={() => console.log("done")}
				>
					DONE
				</div> -->
			</div>
		</div>
	</span>
	<span class={` z-10 h-2 w-2 rounded-full ${colors[status]}`}></span>
</div>

<style>
	.handle:active .extra-panel {
		width: 0rem;
	}
	.handle:hover .extra-panel {
		transition-delay: 300ms;
		width: 15rem;
		height: 100%;
	}
	.handle:hover .plate {
		transition-delay: 300ms;
		opacity: 1;
	}

	/* .extra-panel:hover {
		width: 15rem;
	} */

	/* .extra-panel:hover {
		display: flex;
		width: 15rem;
		padding-right: 0.4rem;
	}

	.extra-panel:hover .toggle {
		display: flex;
	}
	.toggle:hover .toogleT {
		display: block;
	} */
</style>
