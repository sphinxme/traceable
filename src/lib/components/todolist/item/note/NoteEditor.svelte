<script lang="ts">
	/**
	 * NoteEditor — 笔记富文本编辑器（基于 ProseKit）。
	 *
	 * 在 TodoItem 的 Popover 中弹出，提供富文本编辑能力。
	 * 编辑器内容绑定到 Yjs `Y.XmlFragment`（`task.noteDoc`），通过 defineYjs 实现实时同步。
	 *
	 * ## Yjs 数据架构
	 *
	 * 项目使用单一中央 Y.Doc（在 App.svelte 中通过 `newYDoc()` 创建），
	 * 所有任务的 `noteDoc`（`Y.XmlFragment`）都存储在这个 Y.Doc 内的 `tasks` Y.Map 中。
	 * `noteDoc` 是通过 `new Y.XmlFragment()` 直接创建并嵌入 Y.Map 的，
	 * **不是**通过 `doc.getXmlFragment('prosemirror')` 获取的，
	 * 因此 defineYjs 必须显式传入 `fragment` 参数。
	 *
	 * ## Props 设计
	 *
	 * 显式接收 `doc` + `fragment` 两个参数，与 `defineYjs` 签名 1:1 对应，
	 * 避免 `noteDoc.doc` 的 null 检查问题，未来接入 Liveblocks Awareness 时过渡更自然。
	 *
	 * ## Awareness
	 *
	 * 当前创建独立 `new Awareness(doc)` 实例，不连接 Liveblocks，不支持协作光标。
	 * 未来如需支持协作光标，可将 Awareness 来源改为 `room.awareness`。
	 *
	 * ## 图片上传流程
	 *
	 * 1. 用户粘贴/拖放图片 → defineImageUploadHandler 拦截
	 * 2. ProseKit 立即创建 blob URL 并插入 `<img src="blob:...">`（即时预览）
	 * 3. 异步调用 uploadImage → Tauri HTTP → S3 预签名 URL 上传
	 * 4. 上传成功后 ProseKit 自动将 src 从 blob URL 替换为 S3 真实 URL
	 * 5. 组件销毁时 ProseKit 自动 revokeObjectURL
	 *
	 * @prop doc      - 中央 Y.Doc（来自 `db.doc`）
	 * @prop fragment - 任务的笔记 Y.XmlFragment（来自 `controller.task.noteDoc`）
	 * @prop onClose  - 关闭回调（Shift+Enter 触发）
	 */
	import 'prosekit/basic/style.css'
	import 'prosekit/basic/typography.css'
	import { defineBasicExtension } from 'prosekit/basic'
	import {
		createEditor,
		union,
		withPriority,
		defineKeymap,
		Priority,
	} from 'prosekit/core'
	import { defineYjs } from 'prosekit/extensions/yjs'
	import { defineImageUploadHandler } from 'prosekit/extensions/image'
	import { defineSvelteNodeView, ProseKit } from 'prosekit/svelte'
	import { Awareness } from 'y-protocols/awareness'
	import * as Y from 'yjs'
	import { onDestroy } from 'svelte'

	import BubbleMenuToolbar from './BubbleMenuToolbar.svelte'
	import ImageNodeView from './image-node/ImageNodeView.svelte'
	import { uploadImage } from './image-node/uploadImage'

	interface Props {
		doc: Y.Doc
		fragment: Y.XmlFragment
		onClose: () => void
	}

	let { doc, fragment, onClose }: Props = $props()

	// 独立 Awareness 实例，仅满足 defineYjs 必填参数，不连接 Liveblocks
	const awareness = new Awareness(doc)

	// 覆盖 defineBasicExtension 中的 defineHardBreakKeymap（Shift+Enter 默认插入换行）
	// 需要最高优先级才能胜出
	const shiftEnterClose = withPriority(
		defineKeymap({
			'Shift-Enter': () => {
				onClose()
				return true
			},
		}),
		Priority.highest,
	)

	// defineBasicExtension() 已包含 defineImage()，只需添加上传 handler 和自定义 node view
	const imageUploadHandler = defineImageUploadHandler({
		uploader: async ({ file }) => {
			return await uploadImage(file)
		},
	})

	// 用 defineSvelteNodeView 替换 image 节点的默认渲染，
	// 组件通过 SvelteNodeViewProps 接收 node/selected/setAttrs 等
	const imageNodeView = defineSvelteNodeView({
		name: 'image',
		component: ImageNodeView,
	})

	const extension = union([
		defineBasicExtension(),
		defineYjs({ doc, awareness, fragment }),
		shiftEnterClose,
		imageUploadHandler,
		imageNodeView,
	])

	export const editor = createEditor({ extension })

	onDestroy(() => {
		awareness.destroy()
		editor.unmount()
	})
</script>

<ProseKit {editor}>
	<div {@attach editor.mount} class="min-h-[100px] focus:outline-none"></div>
	<BubbleMenuToolbar />
</ProseKit>
