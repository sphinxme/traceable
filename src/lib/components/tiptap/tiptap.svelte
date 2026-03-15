<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { Editor } from "@tiptap/core";
	import StarterKit from "@tiptap/starter-kit";
	import Collaboration from "@tiptap/extension-collaboration";
	import BubbleMenu from "@tiptap/extension-bubble-menu";
	import FileHandler from "@tiptap/extension-file-handler";
	import type { Extension } from "@tiptap/core";
	import * as Y from "yjs";
	import { uploadImage } from "./uploadImage";
	import { CustomImage } from "./extensions/CustomImage";

	interface Props {
		yDoc: Y.XmlFragment;
		customExtensions?: Extension[];
		onShiftEnter?: () => void;
		editorProps?: any;
	}

	let {
		yDoc,
		customExtensions = [],
		onShiftEnter,
		editorProps = {},
	}: Props = $props();

	let editorState = $state<{ editor: Editor | null }>({ editor: null });
	let bubbleMenu = $state<HTMLElement | null>(null);
	let element = $state<HTMLElement | null>(null);

	onMount(() => {
		let editor: Editor;

		const extensions = [
			StarterKit.configure({
				// document: false,
				// history: false,
				undoRedo: false,
			}),
			Collaboration.configure({
				fragment: yDoc,
			}),
			CustomImage,
			FileHandler.configure({
				allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
				onPaste: (_view, files) => {
					for (const file of files) {
						if (!file.type.startsWith("image/")) continue;
						uploadImage(file)
							.then((url) => {
								editor.chain().focus().setImage({ src: url }).run();
							})
							.catch((err) => {
								console.error("图片上传失败", err);
							});
					}
				},
				onDrop: () => false,
			}),
			// BubbleMenu.configure({
			// 	element: bubbleMenu,
			// }),
			...customExtensions,
		];

		editor = new Editor({
			element: element,
			extensions: extensions,
			editorProps: {
				attributes: {
					class: "prose prose-sm max-w-none focus:outline-none min-h-[100px]",
				},
				...editorProps,
			},
			onTransaction: ({ editor: e }) => {
				editorState = { editor: e };
			},
		});

		editorState.editor = editor;
	});

	onDestroy(() => {
		editorState.editor?.destroy();
	});

	export function focus() {
		editorState.editor?.commands.focus();
	}
</script>

<div style="position: relative" class="app">
	{#if editorState.editor}
		<div class="fixed-menu">
			<button
				onclick={() =>
					editorState.editor
						?.chain()
						.focus()
						.toggleHeading({ level: 1 })
						.run()}
				class:active={editorState.editor?.isActive("heading", {
					level: 1,
				})}
			>
				H1
			</button>
			<button
				onclick={() =>
					editorState.editor
						?.chain()
						.focus()
						.toggleHeading({ level: 2 })
						.run()}
				class:active={editorState.editor?.isActive("heading", {
					level: 2,
				})}
			>
				H2
			</button>
			<button
				onclick={() =>
					editorState.editor?.chain().focus().setParagraph().run()}
				class:active={editorState.editor?.isActive("paragraph")}
			>
				P
			</button>
		</div>
	{/if}

	<div bind:this={element}></div>
</div>

<style>
	button.active {
		background: black;
		color: white;
	}
</style>
