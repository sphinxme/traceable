<script lang="ts">
	import { quill } from "$lib/components/quill/quill";
	import type Quill from "quill";
	import { onMount } from "svelte";
	import * as Y from "yjs";

	interface Props {
		text: Y.Text;
		onClose: () => void;
	}

	let { text, onClose }: Props = $props();
	let editor: Quill;

	export function focus() {
		editor.focus();
	}
</script>

<div
	use:quill={{
		text,
		init(_editor) {
			editor = _editor;
			_editor.keyboard.bindings["Enter"].unshift({
				key: "Enter",
				shiftKey: true,
				handler(range, curContext, binding) {
					onClose();
					return false;
				},
			});
		},
	}}
></div>
