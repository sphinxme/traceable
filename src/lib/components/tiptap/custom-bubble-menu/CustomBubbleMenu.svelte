<script lang="ts">
	import { fade } from "svelte/transition";
	import { untrack } from "svelte";
	import type { Snippet } from "svelte";
	import type { Editor } from "@tiptap/core";
	import type { EditorView } from "@tiptap/pm/view";
	import type { EditorState } from "@tiptap/pm/state";
	import type { BubbleMenuHandlers } from "./plugin";
	import {
		computeBubblePosition,
		getShouldShow,
		getVirtualElement,
		type FloatingOptions,
	} from "./positioning";

	interface Props {
		editor: Editor;
		handlers: BubbleMenuHandlers;
		options?: FloatingOptions;
		pluginKey?: string;
		scrollTarget?: HTMLElement | Window;
		transitionMs?: number;
		children: Snippet;
	}

	let {
		editor,
		handlers,
		options = {},
		pluginKey = "bubbleMenu",
		scrollTarget = window,
		transitionMs = 120,
		children,
	}: Props = $props();

	let visible = $state(false);
	let preventHide = false;
	let container = $state<HTMLElement | null>(null);
	let resizeTimer: ReturnType<typeof setTimeout> | null = null;

	let floOptions = $state<FloatingOptions>({
		placement: "top",
		offset: 8,
		flip: true,
		shift: true,
		...options,
	});

	function debounce(fn: () => void, ms: number) {
		if (resizeTimer) clearTimeout(resizeTimer);
		resizeTimer = setTimeout(fn, ms);
	}

	function evaluate(view: EditorView, oldState: EditorState | undefined) {
		const composing = view.composing;
		const selectionChanged = oldState
			? !oldState.selection.eq(view.state.selection)
			: true;
		const docChanged = oldState ? !oldState.doc.eq(view.state.doc) : true;
		if (composing || (!selectionChanged && !docChanged)) return;

		if (
			!getShouldShow({
				editor,
				view,
				state: view.state,
				container,
			})
		) {
			visible = false;
			return;
		}
		visible = true;
		if (container) updatePosition();
	}

	function handleBlur(event: FocusEvent | undefined) {
		if (editor.isDestroyed) return;
		if (preventHide) {
			preventHide = false;
			return;
		}
		const related = event?.relatedTarget as Node | null;
		if (related && container?.parentNode?.contains(related)) return;
		if (related === editor.view.dom) return;
		visible = false;
	}

	function handleMeta(meta: unknown) {
		if (meta === "updatePosition") {
			if (visible) updatePosition();
		} else if (
			meta &&
			typeof meta === "object" &&
			(meta as { type?: string }).type === "updateOptions"
		) {
			floOptions = {
				...floOptions,
				...(meta as { options?: FloatingOptions }).options,
			};
			if (visible) updatePosition();
		}
	}

	async function updatePosition() {
		const el = container;
		if (!el) return;
		const virtual = getVirtualElement({ editor, view: editor.view });
		if (!virtual) return;
		const result = await computeBubblePosition(virtual, el, floOptions);
		if (!container || container !== el) return;
		if (result.referenceHidden || result.escaped) {
			visible = false;
			return;
		}
		container.style.width = "max-content";
		container.style.position = result.strategy;
		container.style.left = `${result.x}px`;
		container.style.top = `${result.y}px`;
	}

	$effect(() => {
		handlers.onUpdate = (view, oldState) => evaluate(view, oldState);

		const onFocus = () =>
			setTimeout(() => evaluate(editor.view, undefined), 0);
		const onBlur = ({ event }: { event: FocusEvent }) => handleBlur(event);
		const onTrans = ({
			transaction,
		}: {
			transaction: { getMeta: (k: string) => unknown };
		}) => handleMeta(transaction.getMeta(pluginKey));
		const onDrag = () => {
			visible = false;
		};
		const onResize = () => {
			if (visible) debounce(() => updatePosition(), 60);
		};

		editor.on("focus", onFocus);
		editor.on("blur", onBlur);
		editor.on("transaction", onTrans);
		editor.view.dom.addEventListener("dragstart", onDrag);
		window.addEventListener("resize", onResize);
		scrollTarget.addEventListener("scroll", onResize);

		untrack(() => evaluate(editor.view, undefined));

		return () => {
			handlers.onUpdate = null;
			editor.off("focus", onFocus);
			editor.off("blur", onBlur);
			editor.off("transaction", onTrans);
			editor.view.dom.removeEventListener("dragstart", onDrag);
			window.removeEventListener("resize", onResize);
			scrollTarget.removeEventListener("scroll", onResize);
			if (resizeTimer) clearTimeout(resizeTimer);
		};
	});

	$effect(() => {
		if (visible && container) updatePosition();
	});
</script>

{#if visible}
	<div
		bind:this={container}
		transition:fade={{ duration: transitionMs }}
		class:pointer-events-none={!visible}
		role="toolbar"
		tabindex="-1"
		style:position="absolute"
		style:z-index="50"
		onmousedowncapture={() => (preventHide = true)}
	>
		{@render children()}
	</div>
{/if}
