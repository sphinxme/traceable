<script lang="ts">
	import type { Editor } from "@tiptap/core";
	import Bold from "@lucide/svelte/icons/bold";
	import Italic from "@lucide/svelte/icons/italic";
	import Strikethrough from "@lucide/svelte/icons/strikethrough";
	import Code from "@lucide/svelte/icons/code";

	interface Props {
		editor: Editor;
	}

	let { editor }: Props = $props();

	let active = $state({
		bold: false,
		italic: false,
		strike: false,
		code: false,
	});

	$effect(() => {
		const update = () => {
			active = {
				bold: editor.isActive("bold"),
				italic: editor.isActive("italic"),
				strike: editor.isActive("strike"),
				code: editor.isActive("code"),
			};
		};
		update();
		editor.on("transaction", update);
		editor.on("selectionUpdate", update);
		return () => {
			editor.off("transaction", update);
			editor.off("selectionUpdate", update);
		};
	});

	function preventFocusLoss(e: MouseEvent) {
		e.preventDefault();
	}
</script>

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
		aria-pressed={active.bold}
		class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {active.bold
			? 'bg-accent text-accent-foreground'
			: ''}"
		onclick={() => editor.chain().focus().toggleBold().run()}
	>
		<Bold size={16} />
	</button>
	<button
		type="button"
		title="斜体"
		aria-pressed={active.italic}
		class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {active.italic
			? 'bg-accent text-accent-foreground'
			: ''}"
		onclick={() => editor.chain().focus().toggleItalic().run()}
	>
		<Italic size={16} />
	</button>
	<button
		type="button"
		title="删除线"
		aria-pressed={active.strike}
		class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {active.strike
			? 'bg-accent text-accent-foreground'
			: ''}"
		onclick={() => editor.chain().focus().toggleStrike().run()}
	>
		<Strikethrough size={16} />
	</button>
	<button
		type="button"
		title="行内代码"
		aria-pressed={active.code}
		class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {active.code
			? 'bg-accent text-accent-foreground'
			: ''}"
		onclick={() => editor.chain().focus().toggleCode().run()}
	>
		<Code size={16} />
	</button>
</div>
