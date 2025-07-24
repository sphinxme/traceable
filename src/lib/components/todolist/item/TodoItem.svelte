<script lang="ts">
	import "quill/dist/quill.core.css";
	import Quill from "quill";
	import { QuillBinding } from "y-quill";
	import { onMount } from "svelte";
	import * as Popover from "$lib/components/ui/popover";

	import EventIndicator from "./event/EventIndicator.svelte";
	import NoteEditor from "./note/NoteEditor.svelte";
	import Overlay from "./overlay/Overlay.svelte";
	import type { TodoController } from "../controller/TodoController.svelte";

	interface Props {
		controller: TodoController;
		overlay?: import("svelte").Snippet;
		handle?: import("svelte").Snippet;
		drag?: import("svelte").Snippet;
		note: string;
	}

	let { controller, overlay, handle, drag, note }: Props = $props();
	let container: HTMLDivElement;
	let editor: Quill;
	let noteEditor: NoteEditor;

	const events = controller.task.events.$;
	let sortedEvents = $derived([...$events].sort((a, b) => a.start - b.start));
	let isCompleted = controller.task.isCompleted$;

	onMount(() => {
		editor = new Quill(container, {
			modules: {
				toolbar: false,
			},
			theme: "bubble",
			placeholder: "",
		});
		editor.keyboard.addBinding({
			key: "ArrowUp",
			handler(range, curContext, binding) {
				return !controller.keyboardActions.navigateUp(
					curContext.offset,
				);
			},
		});
		editor.keyboard.addBinding({
			key: "ArrowDown",
			handler(range, curContext, binding) {
				return !controller.keyboardActions.navigateDown(
					curContext.offset,
				);
			},
		});
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: false,
			handler(range, curContext, binding) {
				return !controller.keyboardActions.enter(
					range,
					curContext,
					this.quill,
				);
			},
		});
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: true,
			handler() {
				controller.keyboardActions.shiftEnter();
				return false;
			},
		});
		editor.keyboard.bindings["Tab"].unshift({
			key: "Tab",
			shiftKey: true,
			handler(range, curContext) {
				controller.keyboardActions.untab(curContext.offset);
			},
		});
		editor.keyboard.bindings["Tab"].unshift({
			key: "Tab",
			shiftKey: false,
			handler(range, curContext) {
				controller.keyboardActions.tab(curContext.offset);
			},
		});

		controller.focusActions.onfocus = (cursorIndex) => {
			editor.setSelection(cursorIndex, 0);
			return true;
		};

		const binding = new QuillBinding(
			controller.task.text,
			editor /*, provider.awareness*/,
		);
		return () => {
			binding.destroy();
		};
	});

	// export const setTitleViewTransitionName = (name: string) => {
	// 	titleViewTransitionName = name;
	// };
</script>

<div class="group flex flex-col">
	<!-- 一整个横条 -->
	<div class=" relative w-full">
		<div class="flex w-full flex-row items-center">
			<Overlay>{@render overlay?.()}</Overlay>
			<div class="flex w-full flex-row items-center">
				{@render handle?.()}
				<div
					class="todoitem w-full"
					style:view-transition-name={controller.transitionActions
						.$titleViewTransitionName}
					style:font-size="large"
					style:text-decoration={$isCompleted ? "line-through" : ""}
					style:opacity={$isCompleted ? 0.5 : 1}
					bind:this={container}
				></div>
			</div>
		</div>
		{@render drag?.()}
	</div>
	<!-- 横条下面的东西 -->

	<div class="flex h-2 flex-row pt-1 items-center">
		<div class="h-1" style:width="18px"></div>
		{#each sortedEvents as event (event.id)}
			<EventIndicator data={event} isCompleted={$isCompleted} />
		{/each}
	</div>

	<Popover.Root bind:open={controller.noteEditOpen}>
		<Popover.Trigger>
			<div
				style:padding-left="18px"
				style:transition-property="margin"
				class=" {$events.isEmpty()
					? '-mt-1'
					: ''}  line-clamp-3 text-nowrap whitespace-pre-line text-ellipsis text-start text-zinc-500 w-full transition"
			>
				{note}
			</div>
		</Popover.Trigger>
		<Popover.Content
			onOpenAutoFocus={(e) => {
				e.preventDefault();
				noteEditor.focus();
			}}
			onCloseAutoFocus={(e) => {
				e.preventDefault();
				editor.focus();
			}}
			align="start"
		>
			<NoteEditor
				bind:this={noteEditor}
				onClose={() => {
					controller.noteEditOpen = false;
					return false;
				}}
				text={controller.task.note}
			/>
		</Popover.Content>
	</Popover.Root>
</div>

<style>
	:global(.todoitem .ql-editor) {
		padding-top: 0px;
		padding-bottom: 0px;
		/* padding-top: 12px; */
		padding-left: 10px;
		padding-right: 15px;
		width: 100%;
		flex-grow: 1;
		text-wrap: nowrap;
		/* padding-bottom: 2px; */

		-ms-overflow-style: none; /* 针对 IE 和 Edge 隐藏滚动条 */
		scrollbar-width: none; /* 针对 Firefox 隐藏滚动条 */
	}

	:global(.todoitem .ql-editor)::-webkit-scrollbar {
		display: none; /* 针对 WebKit 浏览器（如 Chrome、Safari）隐藏滚动条 */
	}

	:global(.todoitem .ql-container) {
		display: flex;
		flex-grow: 1;
		/* padding-bottom: 2px; */
	}
</style>
