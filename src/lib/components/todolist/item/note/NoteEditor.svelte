<script lang="ts">
	import { tiptap } from "$lib/components/tiptap/tiptap";
	import type { Editor } from "@tiptap/core";
	import { Extension } from "@tiptap/core";
	import * as Y from "yjs";

	interface Props {
		noteDoc: Y.Doc;
		onClose: () => void;
	}

	let { noteDoc, onClose }: Props = $props();
	let editor: Editor;

	const ShiftEnterClose = Extension.create({
		name: "shiftEnterClose",
		addKeyboardShortcuts() {
			return {
				"Shift-Enter": () => {
					onClose();
					return true;
				},
			};
		},
	});

	export function focus() {
		editor?.commands.focus();
	}
</script>

<div
	use:tiptap={{
		yDoc: noteDoc,
		configs: {
			extensions: [ShiftEnterClose],
			editorProps: {
				attributes: {
					class: "prose prose-sm max-w-none focus:outline-none min-h-[100px]",
				},
			},
		},
		init(_editor) {
			editor = _editor;
		},
	}}
></div>
