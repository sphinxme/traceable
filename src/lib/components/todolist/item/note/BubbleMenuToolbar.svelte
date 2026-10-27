<script lang="ts">
	/**
	 * BubbleMenuToolbar — 选中文本时弹出的浮动格式工具栏。
	 *
	 * 使用 ProseKit InlinePopover 组件，内置选区追踪、定位计算、显隐逻辑，
	 * 替代了旧版的 手写 ProseMirror Plugin + @floating-ui/dom 集成（~434 行 3 文件）。
	 *
	 * ## 已知限制
	 *
	 * InlinePopoverRoot 不处理 IME composing（中文输入法 composing 时
	 * 选区变化仍可能触发工具栏弹出），需在手动测试中验证是否需要自行添加 composing 守卫。
	 *
	 * ## TypeScript 类型问题
	 *
	 * useEditor() 返回 Readable<Editor<any>>，Editor<any> 的 marks/commands
	 * 类型推导结果为 never（因为 ExtractMarkActions<any> = never），
	 * 因此需要 @ts-expect-error 绕过。这是 ProseKit 当前版本已知的设计限制。
	 */
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
