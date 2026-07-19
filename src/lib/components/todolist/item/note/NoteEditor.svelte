<script lang="ts">
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

	const awareness = new Awareness(doc)

	const shiftEnterClose = withPriority(
		defineKeymap({
			'Shift-Enter': () => {
				onClose()
				return true
			},
		}),
		Priority.highest,
	)

	const imageUploadHandler = defineImageUploadHandler({
		uploader: async ({ file }) => {
			return await uploadImage(file)
		},
	})

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
