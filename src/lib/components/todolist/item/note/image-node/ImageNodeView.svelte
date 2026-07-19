<script lang="ts">
	/**
	 * ImageNodeView — 图片节点的自定义渲染组件。
	 *
	 * 通过 defineSvelteNodeView 注册，替换 image 节点的默认渲染，
	 * ProseKit 自动管理 Svelte 组件生命周期（mount/unmount/update/select/deselect），
	 * 通过 SvelteNodeViewProps 传入 node/selected/setAttrs 等。
	 *
	 * ## 上传状态追踪
	 *
	 * 利用 ProseKit 内置的 UploadTask 追踪上传状态：
	 * - 上传开始时，ProseKit 插入 `<img src="blob:...">` 并在 UploadTask 全局注册
	 * - 通过 `UploadTask.get(blobURL)` 获取任务，监听 `task.finished` 判断上传完成
	 * - 上传完成后，ProseKit 自动将 src 从 blob URL 替换为真实 URL，
	 *   此时 `src.startsWith('blob:')` 为 false → uploading 结束
	 * - 无需自定义 uploadId 属性或外部状态管理
	 *
	 * ## 缩放
	 *
	 * 使用 ProseKit ResizableRoot + ResizableHandle，onResizeEnd 的 detail
	 * 为 `{width: number, height: number}`，直接传给 setAttrs 持久化到 Yjs。
	 * Resizable 仅支持像素值（Issue #1444），与当前使用方式兼容。
	 */
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
		<ResizableHandle position="right" />
	{/if}
</ResizableRoot>
