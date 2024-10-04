<script lang="ts">
	import { getContext } from 'svelte';
	import type { Database } from '$lib/states/db';
	import { quill } from '$lib/components/quill/quill';
	import type { QuillOptions } from 'quill';
	import type Quill from 'quill/core/quill';
	import { warpKeyHandler, type KeyboardHandler } from '$lib/components/quill/model';
	const db: Database = getContext('db');

	export let taskId: string;
	export let enterHandle: KeyboardHandler = () => true;
	export let arrowUpHandle: KeyboardHandler = () => true;
	export let arrowDownHandle: KeyboardHandler = () => true;
	export const focus = (index: number = 0) => {
		qEditor.setSelection({ index, length: 0 });
	};
	let shiftEnterHandle: KeyboardHandler = () => {
		// 弹出
		// openNoteEdit = true;
		return false;
	};

	// let text: Y.Text;

	// todo: 使用top-level-await
	$: loading = db.getTask(taskId).then((task) => {
		const yText = db.texts.get(task.textId);
		if (!yText) {
			throw new Error(`invalid taskId: ${task.textId}`);
		}
		return yText;
	});

	const configs: QuillOptions = {
		modules: {
			toolbar: false
		},
		theme: 'bubble',
		placeholder: ''
	};
	let qEditor: Quill;

	const init = (editor: Quill) => {
		qEditor = editor;
		editor.keyboard.addBinding({
			key: 'ArrowUp',
			handler: warpKeyHandler(arrowUpHandle)
		});
		editor.keyboard.addBinding({
			key: 'ArrowDown',
			handler: warpKeyHandler(arrowDownHandle)
		});
		editor.keyboard.bindings['Enter'].unshift({
			key: 'Enter',
			shiftKey: false,
			handler: warpKeyHandler(enterHandle)
		});
		editor.keyboard.bindings['Enter'].unshift({
			key: 'Enter',
			shiftKey: true,
			handler: warpKeyHandler(shiftEnterHandle)
		});
	};
</script>

<h1
	class="traceable-quill-title scroll-m-20 py-4 text-3xl font-bold tracking-tight transition-colors first:mt-0"
>
	{#await loading}
		loading...
	{:then text}
		<div use:quill={{ text, configs, init }} />
	{/await}
</h1>

<style>
	:global(.traceable-quill-title .ql-container) {
		font-size: xx-large;
		/* display: flex; */

		/* flex-grow: 1; */
		/* padding-bottom: 2px; */
	}
</style>
