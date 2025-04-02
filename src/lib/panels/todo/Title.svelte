<script lang="ts">
	import { quill } from "$lib/components/quill/quill";
	import type { QuillOptions } from "quill";
	import type Quill from "quill/core/quill";
	import {
		warpKeyHandler,
		type KeyboardHandler,
	} from "$lib/components/quill/model";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";

	interface Props {
		task: TaskProxy;
		enterHandle?: KeyboardHandler;
		arrowUpHandle?: KeyboardHandler;
		arrowDownHandle?: KeyboardHandler;
		highlightTitle?: boolean;
		viewTransitionName?: string;
	}

	let {
		task,
		enterHandle = () => true,
		arrowUpHandle = () => true,
		arrowDownHandle = () => true,
		highlightTitle,
		viewTransitionName,
	}: Props = $props();
	export const focus = (index: number = 0) => {
		qEditor.setSelection({ index, length: 0 });
	};
	let shiftEnterHandle: KeyboardHandler = () => {
		// 弹出
		// openNoteEdit = true;
		return false;
	};
	let text = $derived(task.text);

	const configs: QuillOptions = {
		modules: {
			toolbar: false,
		},
		theme: "bubble",
		placeholder: "",
	};
	let qEditor: Quill;

	const init = (editor: Quill) => {
		qEditor = editor;
		editor.keyboard.addBinding({
			key: "ArrowUp",
			handler: warpKeyHandler(arrowUpHandle),
		});
		editor.keyboard.addBinding({
			key: "ArrowDown",
			handler: warpKeyHandler(arrowDownHandle),
		});
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: false,
			handler: warpKeyHandler(enterHandle),
		});
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: true,
			handler: warpKeyHandler(shiftEnterHandle),
		});
	};
</script>

<!-- svelte-ignore a11y_missing_content -->
<h1
	class="traceable-quill-title scroll-m-20 group py-4 text-3xl font-bold tracking-tight relative transition-colors first:mt-0"
	style:view-transition-name={viewTransitionName}
>
	{#if highlightTitle}
		<div
			class=" absolute h-full bg-zinc-300 group-hover:bg-zinc-500 transition duration-500 rounded-full"
			style:width="2px"
		></div>
	{/if}
	<div use:quill={{ text, configs, init }}></div>
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
