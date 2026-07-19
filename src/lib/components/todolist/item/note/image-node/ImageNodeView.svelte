<script lang="ts">
	import type { SvelteNodeViewProps } from 'prosekit/svelte'
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
	<ResizableHandle position="bottom-right" />
</ResizableRoot>
