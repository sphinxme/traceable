<script lang="ts">
	import hotkeys from "hotkeys-js";
	import type { TodoController } from "../controller/TodoController.svelte";
	import { eventbus } from "../controller/eventbus.svelte";
	import { getInteractionContext } from "$lib/interaction/context.svelte";

	interface Props {
		controller: TodoController;
		index: number;
		topTaskId?: string | undefined;
		bottomTaskId?: string | undefined;
	}

	let { controller, index }: Props = $props();

	const { drag, keyboard } = getInteractionContext();

	let hovering = $state(false);
	$effect(() => {
		const setHoverFalse = () => {
			hovering = false;
		};
		eventbus.on("drag:end", setHoverFalse);
		return () => {
			eventbus.off("drag:end", setHoverFalse);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class=" relative transition-height w-full duration-300 {hovering
		? 'h-2'
		: 'h-0'}"
>
	<!-- 拖拽检测区域(超出上方的relative范围) -->
	{#if drag.active}
		<div
			class:hovering
			class=" absolute -bottom-1.5 -top-3 flex w-full flex-col items-center justify-center"
			ondragover={(event) => {
				event.preventDefault();

				if (event.dataTransfer) {
					event.dataTransfer.dropEffect =
						controller.dragDropActions.dragOverMe(keyboard.metaKey);
					if (event.dataTransfer.dropEffect === "none") {
						hovering = false;
					}
				}
			}}
			ondrop={(event) => {
				event.preventDefault();
				console.log({ m: hotkeys.modifier });
				controller.dragDropActions.dropIntoMe(keyboard.metaKey, index);
			}}
			ondragenter={() => (hovering = true)}
			ondragleave={() => (hovering = false)}
			style:z-index={controller.depth}
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
