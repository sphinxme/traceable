<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { Editor } from "@tiptap/core";
	import StarterKit from "@tiptap/starter-kit";
	import Collaboration from "@tiptap/extension-collaboration";
	import FileHandler from "@tiptap/extension-file-handler";
	import type { Extension } from "@tiptap/core";
	import * as Y from "yjs";
	import { uploadImage } from "./image-node/uploadImage";
	import { CustomImage } from "./image-node/CustomImage";
	import { uploadTasks } from "./image-node/imageUploadState.svelte";
	import BubbleMenuToolbar from "./BubbleMenuToolbar.svelte";
	import {
		CustomBubbleMenu,
		createHandlers,
	} from "./custom-bubble-menu";
	import CustomBubbleMenuView from "./custom-bubble-menu/CustomBubbleMenu.svelte";

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
	let element = $state<HTMLElement | null>(null);
	const bubbleMenuHandlers = createHandlers();

	async function getImageDimensions(
		file: File,
	): Promise<{ width: number; height: number }> {
		const url = URL.createObjectURL(file);
		const img = new Image();
		return new Promise((resolve) => {
			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve({ width: img.naturalWidth, height: img.naturalHeight });
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				resolve({ width: 200, height: 150 });
			};
			img.src = url;
		});
	}

	function findImagePosByUploadId(
		editor: Editor,
		uploadId: string,
	): number | null {
		let foundPos: number | null = null;
		editor.state.doc.nodesBetween(
			0,
			editor.state.doc.content.size,
			(node, pos) => {
				if (foundPos !== null) return false;
				if (
					node.type.name === "image" &&
					node.attrs.uploadId === uploadId
				) {
					foundPos = pos;
					return false;
				}
			},
		);
		return foundPos;
	}

	async function insertImageWithUpload(file: File, editor: Editor) {
		const dims = await getImageDimensions(file);
		const uploadId = crypto.randomUUID();

		editor
			.chain()
			.focus()
			.setImage({
				src: "",
				width: dims.width,
				height: dims.height,
				uploadId,
				alt: file.name,
			} as any)
			.run();

		uploadTasks.set(uploadId, { progress: 0, status: "uploading" });

		try {
			const url = await uploadImage(file);
			const pos = findImagePosByUploadId(editor, uploadId);
			if (pos !== null) {
				const node = editor.state.doc.nodeAt(pos);
				if (node && node.type.name === "image") {
					editor.view.dispatch(
						editor.state.tr.setNodeMarkup(pos, undefined, {
							...node.attrs,
							src: url,
							uploadId: null,
						}),
					);
				}
			}
			uploadTasks.delete(uploadId);
		} catch (err) {
			console.error("图片上传失败", err);
			uploadTasks.set(uploadId, { progress: 0, status: "error" });
		}
	}

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
				allowedMimeTypes: [
					"image/jpeg",
					"image/png",
					"image/gif",
					"image/webp",
				],
				onPaste: (_view, files) => {
					for (const file of files) {
						if (!file.type.startsWith("image/")) continue;
						insertImageWithUpload(file, editor);
					}
				},
				onDrop: () => false,
			}),
			CustomBubbleMenu.configure({
				handlers: bubbleMenuHandlers,
				options: {
					placement: "top",
					offset: 8,
					flip: true,
					shift: true,
				},
			}),
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
		<CustomBubbleMenuView
			editor={editorState.editor}
			handlers={bubbleMenuHandlers}
			options={{ placement: "top", offset: 8, flip: true, shift: true }}
		>
			{#snippet children()}
				<BubbleMenuToolbar editor={editorState.editor} />
			{/snippet}
		</CustomBubbleMenuView>
	{/if}

	<div bind:this={element}></div>
</div>
