<script lang="ts">
	import type { SvelteNodeViewProps } from 'prosekit/svelte'
	import { UploadTask } from 'prosekit/extensions/file'
	import {
		ResizableRoot,
		ResizableHandle,
	} from 'prosekit/svelte/resizable'

	let { node, selected, setAttrs }: SvelteNodeViewProps = $props()

	let attrs = $derived($node.attrs as {
		src?: string
		width?: number | null
		height?: number | null
	})
	let src = $derived(attrs.src ?? '')
	let width = $derived(attrs.width ?? undefined)
	let height = $derived(attrs.height ?? undefined)
	let aspectRatio = $derived(
		width && height ? width / height : undefined,
	)

	let objectURL = $derived(src.startsWith('blob:') ? src : null)
	let uploading = $state(false)

	$effect(() => {
		const url = objectURL
		if (!url) {
			uploading = false
			return
		}
		const task = UploadTask.get(url)
		if (!task) {
			uploading = false
			return
		}
		uploading = true
		task.finished.finally(() => {
			uploading = false
		})
	})
</script>

<ResizableRoot
	{width}
	{height}
	{aspectRatio}
	onResizeEnd={(e) => setAttrs(e.detail)}
>
	{#if src}
		<img
			{src}
			alt=""
			class="block max-w-full select-none rounded-md transition-shadow duration-200 hover:shadow-md hover:ring-1 hover:ring-border/60 {$selected ? 'shadow-md ring-1 ring-border/60' : ''}"
			draggable="false"
		/>
	{:else}
		<div
			class="flex min-h-[150px] min-w-[200px] items-center justify-center rounded bg-gray-100 text-sm text-gray-400"
		>
			<span>Image</span>
		</div>
	{/if}

	{#if uploading}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-black/40 text-white"
		>
			<div
				class="h-6 w-6 animate-spin rounded-full border-[3px] border-white/30 border-t-white"
			></div>
			<div class="text-xs font-medium">Uploading...</div>
		</div>
	{/if}

	{#if !uploading}
		<ResizableHandle position="bottom-right" />
	{/if}
</ResizableRoot>
