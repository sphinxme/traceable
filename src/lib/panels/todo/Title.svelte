<script lang="ts">
	import { getContext } from 'svelte';
	import type { Database, TaskProxy } from '$lib/states/rxdb';
	import { quill } from '$lib/components/quill/quill';
	import type { QuillOptions } from 'quill';
	import type Quill from 'quill/core/quill';
	import { warpKeyHandler, type KeyboardHandler } from '$lib/components/quill/model';
	import type { Observable } from 'rxjs';
	const db: Database = getContext('db');

	export let task: Observable<TaskProxy>;
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
	let text = db.texts.get($task.textId);
	if (!text) {
		throw new Error(`invalid taskId: ${$task.textId}`);
	}
	$: if (task) {
		text = db.texts.get($task.textId);
		console.log('updating text');
	}

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
	<div use:quill={{ text, configs, init }} />
</h1>

<style>
	:global(.traceable-quill-title .ql-container) {
		font-size: xx-large;
		/* display: flex; */

		/* flex-grow: 1; */
		/* padding-bottom: 2px; */
	}
</style>
