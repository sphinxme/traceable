<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor } from '@tiptap/core';

	interface Props {
		node: any;
		editor: Editor;
		getPos: () => number | undefined;
	}

	let {
		node,
		editor,
		getPos,
	}: Props = $props();

	let myNode = $state(node);

	let src = $derived(myNode.attrs.src ?? '');
	let alt = $derived(myNode.attrs.alt ?? '');
	let title = $derived(myNode.attrs.title ?? '');
	let width = $derived(myNode.attrs.width ?? undefined);
	let height = $derived(myNode.attrs.height ?? undefined);

	let isDragging = $state(false);
	let resizeHandle = $state<string | null>(null);
	let startWidth = $state(0);
	let startHeight = $state(0);
	let aspectRatio = $state(0);
	let startX = $state(0);
	let startY = $state(0);

	const MIN_SIZE = 50;

	let imgElement: HTMLImageElement;
	let wrapperElement: HTMLElement;

	export function updateNode(newNode: any) {
		myNode = newNode;
	}

	function handleResizeStart(handle: string, event: MouseEvent | TouchEvent) {
		event.preventDefault();
		event.stopPropagation();

		isDragging = true;
		resizeHandle = handle;

		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

		startX = clientX;
		startY = clientY;
		startWidth = imgElement.offsetWidth;
		startHeight = imgElement.offsetHeight;
		aspectRatio = startHeight > 0 ? startWidth / startHeight : 0;

		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
		document.addEventListener('touchmove', handleResizeMove, { passive: false });
		document.addEventListener('touchend', handleResizeEnd);
	}

	function handleResizeMove(event: MouseEvent | TouchEvent) {
		if (!isDragging || !resizeHandle) return;

		const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

		const deltaX = clientX - startX;
		const deltaY = clientY - startY;

		let newWidth = startWidth;
		let newHeight = startHeight;

		if (resizeHandle.includes('right')) {
			newWidth = startWidth + deltaX;
		}
		if (resizeHandle.includes('left')) {
			newWidth = startWidth - deltaX;
		}
		if (resizeHandle.includes('bottom')) {
			newHeight = startHeight + deltaY;
		}
		if (resizeHandle.includes('top')) {
			newHeight = startHeight - deltaY;
		}

		newWidth = Math.max(MIN_SIZE, newWidth);
		newHeight = Math.max(MIN_SIZE, newHeight);

		if (aspectRatio > 0) {
			const hasHorizontal = resizeHandle.includes('right') || resizeHandle.includes('left');
			if (hasHorizontal) {
				newHeight = newWidth / aspectRatio;
			} else {
				newWidth = newHeight * aspectRatio;
			}
		}

		imgElement.style.width = `${newWidth}px`;
		imgElement.style.height = `${newHeight}px`;
	}

	function handleResizeEnd() {
		if (!isDragging) return;

		const newWidth = imgElement.offsetWidth;
		const newHeight = imgElement.offsetHeight;
		const pos = getPos();

		editor
			.chain()
			.setNodeSelection(pos)
			.updateAttributes('image', {
				width: newWidth,
				height: newHeight,
			})
			.run();

		isDragging = false;
		resizeHandle = null;

		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
		document.removeEventListener('touchmove', handleResizeMove);
		document.removeEventListener('touchend', handleResizeEnd);
	}

	onDestroy(() => {
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
		document.removeEventListener('touchmove', handleResizeMove);
		document.removeEventListener('touchend', handleResizeEnd);
	});
</script>

<div class="image-node-wrapper" bind:this={wrapperElement}>
	<img
		bind:this={imgElement}
		{src}
		{alt}
		{title}
		style:width={width ? `${width}px` : undefined}
		style:height={height ? `${height}px` : undefined}
		draggable="false"
	/>

	{#if !isDragging}
		<div
			class="resize-handle top-left"
			role="button"
			tabindex="0"
			aria-label="Resize image from top-left"
			onmousedown={(e) => handleResizeStart('top-left', e)}
			ontouchstart={(e) => handleResizeStart('top-left', e)}
		></div>
		<div
			class="resize-handle top-right"
			role="button"
			tabindex="0"
			aria-label="Resize image from top-right"
			onmousedown={(e) => handleResizeStart('top-right', e)}
			ontouchstart={(e) => handleResizeStart('top-right', e)}
		></div>
		<div
			class="resize-handle bottom-left"
			role="button"
			tabindex="0"
			aria-label="Resize image from bottom-left"
			onmousedown={(e) => handleResizeStart('bottom-left', e)}
			ontouchstart={(e) => handleResizeStart('bottom-left', e)}
		></div>
		<div
			class="resize-handle bottom-right"
			role="button"
			tabindex="0"
			aria-label="Resize image from bottom-right"
			onmousedown={(e) => handleResizeStart('bottom-right', e)}
			ontouchstart={(e) => handleResizeStart('bottom-right', e)}
		></div>
	{/if}
</div>

<style>
	.image-node-wrapper {
		position: relative;
		display: inline-block;
		line-height: 0;
	}

	.image-node-wrapper img {
		display: block;
		max-width: 100%;
		user-select: none;
		-webkit-user-drag: none;
	}

	.resize-handle {
		position: absolute;
		width: 12px;
		height: 12px;
		background-color: white;
		border: 2px solid #3b82f6;
		border-radius: 50%;
		opacity: 0;
		transition: opacity 0.15s ease;
		z-index: 10;
	}

	.image-node-wrapper:hover .resize-handle {
		opacity: 1;
	}

	.resize-handle:active {
		background-color: #3b82f6;
	}

	.resize-handle.top-left {
		top: -6px;
		left: -6px;
		cursor: nwse-resize;
	}

	.resize-handle.top-right {
		top: -6px;
		right: -6px;
		cursor: nesw-resize;
	}

	.resize-handle.bottom-left {
		bottom: -6px;
		left: -6px;
		cursor: nesw-resize;
	}

	.resize-handle.bottom-right {
		bottom: -6px;
		right: -6px;
		cursor: nwse-resize;
	}

	@media (max-width: 768px) {
		.resize-handle {
			width: 16px;
			height: 16px;
		}

		.resize-handle.top-left {
			top: -8px;
			left: -8px;
		}

		.resize-handle.top-right {
			top: -8px;
			right: -8px;
		}

		.resize-handle.bottom-left {
			bottom: -8px;
			left: -8px;
		}

		.resize-handle.bottom-right {
			bottom: -8px;
			right: -8px;
		}
	}
</style>
