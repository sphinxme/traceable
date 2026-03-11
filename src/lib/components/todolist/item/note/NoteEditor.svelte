<script lang="ts">
	import TipTap from "$lib/components/tiptap/tiptap.svelte";
	import { Extension } from "@tiptap/core";
	import * as Y from "yjs";

	interface Props {
		noteDoc: Y.XmlFragment;
		onClose: () => void;
	}

	let { noteDoc, onClose }: Props = $props();
	let tipTapRef: { focus: () => void };

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
		tipTapRef?.focus();
	}
</script>

<TipTap
	yDoc={noteDoc}
	customExtensions={[ShiftEnterClose]}
	bind:this={tipTapRef}
/>
