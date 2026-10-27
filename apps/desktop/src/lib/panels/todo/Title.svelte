<script lang="ts">
	import { quill } from "$lib/components/quill/quill";
	import Quill, { type QuillOptions } from "quill";
	import type { TodoController } from "$lib/components/todolist/controller/TodoController.svelte";

	interface Props {
		controller: TodoController;
		highlightTitle?: boolean;
	}

	let { controller, highlightTitle }: Props = $props();

	const configs: QuillOptions = {
		modules: {
			toolbar: false,
		},
		theme: "bubble",
		placeholder: "",
	};

	const init = (editor: Quill) => {
		editor.keyboard.addBinding({
			key: "ArrowUp",
			handler(range, curContext, binding) {
				// TODO:
				// return controller.keyboardActions.navigateUp(range.index);
			},
		});
		editor.keyboard.addBinding({
			key: "ArrowDown",
			handler(range, curContext, binding) {
				return controller.keyboardActions.navigateDown(0);
			},
		});
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: false,
			handler(range, curContext, binding) {
				controller.keyboardActions.enter(range, curContext, this.quill);
				return true;
			},
		});
		// editor.keyboard.addBinding()
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: true,
			handler(range, curContext, binding) {
				return true;
			},
		});

		controller.focusActions.onfocus = (cursorIndex) => {
			editor.setSelection(cursorIndex);
			return true;
		};
	};
</script>

<!-- svelte-ignore a11y_missing_content -->
<h1
	class="traceable-quill-title scroll-m-20 group py-4 text-3xl font-bold tracking-tight relative transition-colors first:mt-0"
	style:view-transition-name={controller.transitionActions
		.$titleViewTransitionName}
>
	{#if highlightTitle}
		<div
			class=" absolute h-full bg-zinc-300 group-hover:bg-zinc-500 transition duration-500 rounded-full"
			style:width="2px"
		></div>
	{/if}
	<div use:quill={{ text: controller.task.text, configs, init }}></div>
</h1>

<style>
	:global(.traceable-quill-title .ql-container) {
		font-size: xx-large;
		padding-top: 0px;
		padding-bottom: 0px;

		/* display: flex; */

		/* flex-grow: 1; */
		/* padding
		
		-bottom: 2px; */
	}
	:global(.traceable-quill-title .ql-editor) {
		padding-top: 0px;
		padding-bottom: 0px;
		/* padding-top: 12px; */
		width: 100%;
		flex-grow: 1;
		/* padding-bottom: 2px; */
	}
</style>
