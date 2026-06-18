<script lang="ts">
	import { onDestroy } from "svelte";
	import type { Editor } from "@tiptap/core";
	import { uploadTasks } from "./imageUploadState.svelte";

	interface Props {
		node: any;
		editor: Editor;
		getPos: () => number | undefined;
	}

	let { node, editor, getPos }: Props = $props();

	let myNode = $state(node);

	let src = $derived(myNode.attrs.src ?? "");
	let alt = $derived(myNode.attrs.alt ?? "");
	let title = $derived(myNode.attrs.title ?? "");
	let width = $derived(myNode.attrs.width ?? undefined);
	let height = $derived(myNode.attrs.height ?? undefined);
	let uploadId = $derived(myNode.attrs.uploadId ?? null);

	let task = $derived(uploadId ? uploadTasks.get(uploadId) : undefined);
	let isUploading = $derived(task?.status === "uploading");
	let hasError = $derived(task?.status === "error" || (src === "" && !task));
	let showResizeHandle = $derived(src !== "" && !isUploading && !hasError);

	let isResizing = $state(false);
	let startWidth = $state(0);
	let startX = $state(0);

	const MIN_SIZE = 50;

	let imgElement: HTMLImageElement;
	let isNodeSelected = $state(false);

	export function updateNode(newNode: any) {
		myNode = newNode;
	}

	export function setSelected(value: boolean) {
		isNodeSelected = value;
	}

	function handleResizeStart(event: MouseEvent | TouchEvent) {
		event.preventDefault();
		event.stopPropagation();

		isResizing = true;

		const clientX =
			"touches" in event ? event.touches[0].clientX : event.clientX;

		startX = clientX;
		startWidth = imgElement.offsetWidth;

		document.addEventListener("mousemove", handleResizeMove);
		document.addEventListener("mouseup", handleResizeEnd);
		document.addEventListener("touchmove", handleResizeMove, {
			passive: false,
		});
		document.addEventListener("touchend", handleResizeEnd);
	}

	function handleResizeMove(event: MouseEvent | TouchEvent) {
		if (!isResizing) return;

		const clientX =
			"touches" in event ? event.touches[0].clientX : event.clientX;

		const deltaX = clientX - startX;
		let newWidth = startWidth + deltaX;
		newWidth = Math.max(MIN_SIZE, newWidth);

		imgElement.style.width = `${newWidth}px`;
		imgElement.style.height = "auto";
	}

	function handleResizeEnd() {
		if (!isResizing) return;

		const newWidth = imgElement.offsetWidth;
		const newHeight = imgElement.offsetHeight;
		const pos = getPos();
		if (pos == null) return;

		editor
			.chain()
			.setNodeSelection(pos)
			.updateAttributes("image", {
				width: newWidth,
				height: newHeight,
			})
			.run();

		isResizing = false;

		document.removeEventListener("mousemove", handleResizeMove);
		document.removeEventListener("mouseup", handleResizeEnd);
		document.removeEventListener("touchmove", handleResizeMove);
		document.removeEventListener("touchend", handleResizeEnd);
	}

	onDestroy(() => {
		document.removeEventListener("mousemove", handleResizeMove);
		document.removeEventListener("mouseup", handleResizeEnd);
		document.removeEventListener("touchmove", handleResizeMove);
		document.removeEventListener("touchend", handleResizeEnd);

		if (uploadId) {
			uploadTasks.delete(uploadId);
		}
	});
</script>

<div class="group relative mx-auto w-fit">
	{#if src}
		<img
			bind:this={imgElement}
			{src}
			{alt}
			{title}
			style:width={width ? `${width}px` : undefined}
			style:height={height ? `${height}px` : undefined}
			draggable="false"
			class="block max-w-full select-none rounded-md transition-shadow duration-200 hover:shadow-md hover:ring-1 hover:ring-border/60 {isNodeSelected ? 'ring-1 ring-primary/50' : ''}"
		/>
	{:else}
		<div
			class="flex min-h-[150px] min-w-[200px] items-center justify-center rounded bg-gray-100 text-sm text-gray-400"
			style:width={width ? `${width}px` : "200px"}
			style:height={height ? `${height}px` : "150px"}
		>
			<span>Image</span>
		</div>
	{/if}

	{#if isUploading}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-black/40 text-white"
		>
			<div
				class="h-6 w-6 animate-spin rounded-full border-[3px] border-white/30 border-t-white"
			></div>
			<div class="text-xs font-medium">Uploading...</div>
		</div>
	{:else if hasError}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-red-500/10 text-red-500"
		>
			<span>Upload failed</span>
		</div>
	{/if}

	{#if showResizeHandle}
		<div
			class="absolute top-1/2 -translate-y-1/2 -right-1 w-1 h-10 cursor-col-resize rounded-full bg-gray-400/50 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-500/70 {isNodeSelected || isResizing ? 'opacity-100' : ''}"
			role="button"
			tabindex="0"
			aria-label="Resize image"
			onmousedown={handleResizeStart}
			ontouchstart={handleResizeStart}
		></div>
	{/if}
</div>
