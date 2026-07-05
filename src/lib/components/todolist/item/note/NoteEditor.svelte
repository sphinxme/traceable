<script lang="ts">
	/**
	 * NoteEditor — 笔记编辑器组件（基于 Tiptap）。
	 *
	 * 在 TodoItem 的 Popover 中弹出，提供富文本编辑能力。
	 * 编辑器内容绑定到 Yjs `Y.XmlFragment`（`task.noteDoc`），支持实时同步。
	 *
	 * **快捷键**：Shift+Enter 关闭编辑器（通过自定义 Tiptap Extension 实现）。
	 *
	 * @prop noteDoc - Yjs XmlFragment 文档
	 * @prop onClose - 关闭回调
	 */
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
