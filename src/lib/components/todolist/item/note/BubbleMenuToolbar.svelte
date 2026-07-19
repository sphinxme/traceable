<script lang="ts">
	import { useEditor, useEditorDerivedValue } from 'prosekit/svelte'
	import {
		InlinePopoverRoot,
		InlinePopoverPositioner,
		InlinePopoverPopup,
	} from 'prosekit/svelte/inline-popover'
	import Bold from '@lucide/svelte/icons/bold'
	import Italic from '@lucide/svelte/icons/italic'
	import Strikethrough from '@lucide/svelte/icons/strikethrough'
	import Code from '@lucide/svelte/icons/code'

	const editor = useEditor()

	const active = useEditorDerivedValue((e) => ({
		// @ts-expect-error ProseKit context cannot infer extension types
		bold: e.marks.bold.isActive(),
		// @ts-expect-error ProseKit context cannot infer extension types
		italic: e.marks.italic.isActive(),
		// @ts-expect-error ProseKit context cannot infer extension types
		strike: e.marks.strike.isActive(),
		// @ts-expect-error ProseKit context cannot infer extension types
		code: e.marks.code.isActive(),
	}))

	function preventFocusLoss(e: MouseEvent) {
		e.preventDefault()
	}
</script>

<InlinePopoverRoot>
	<InlinePopoverPositioner placement="top">
		<InlinePopoverPopup>
			<div
				class="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
				role="toolbar"
				aria-label="文本格式"
				tabindex="-1"
				onmousedown={preventFocusLoss}
			>
				<button
					type="button"
					title="加粗"
					aria-pressed={$active.bold}
					class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {$active.bold ? 'bg-accent text-accent-foreground' : ''}"
					onclick={() => {
						// @ts-expect-error ProseKit context cannot infer extension types
						$editor.commands.toggleBold()
					}}
				>
					<Bold size={16} />
				</button>
				<button
					type="button"
					title="斜体"
					aria-pressed={$active.italic}
					class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {$active.italic ? 'bg-accent text-accent-foreground' : ''}"
					onclick={() => {
						// @ts-expect-error ProseKit context cannot infer extension types
						$editor.commands.toggleItalic()
					}}
				>
					<Italic size={16} />
				</button>
				<button
					type="button"
					title="删除线"
					aria-pressed={$active.strike}
					class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {$active.strike ? 'bg-accent text-accent-foreground' : ''}"
					onclick={() => {
						// @ts-expect-error ProseKit context cannot infer extension types
						$editor.commands.toggleStrike()
					}}
				>
					<Strikethrough size={16} />
				</button>
				<button
					type="button"
					title="行内代码"
					aria-pressed={$active.code}
					class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {$active.code ? 'bg-accent text-accent-foreground' : ''}"
					onclick={() => {
						// @ts-expect-error ProseKit context cannot infer extension types
						$editor.commands.toggleCode()
					}}
				>
					<Code size={16} />
				</button>
			</div>
		</InlinePopoverPopup>
	</InlinePopoverPositioner>
</InlinePopoverRoot>
