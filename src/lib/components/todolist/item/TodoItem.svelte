<script lang="ts">
	import "quill/dist/quill.core.css";
	import Quill from "quill";
	import { QuillBinding } from "y-quill";
	import { getContext, onMount } from "svelte";
	import * as Popover from "$lib/components/ui/popover";

	import { warpKeyHandler, type KeyboardHandler } from "../../quill/model";
	import EventIndicator from "./event/EventIndicator.svelte";
	import NoteEditor from "./note/NoteEditor.svelte";
	import Overlay from "./overlay/Overlay.svelte";
	import type { TaskProxy } from "$lib/states/meta/task.svelte";

	interface Props {
		task: TaskProxy;
		arrowUpHandle?: KeyboardHandler;
		arrowDownHandle?: KeyboardHandler;
		enterHandle?: KeyboardHandler;
		tabHandle?: any;
		untabHandle?: any;
		overlay?: import("svelte").Snippet;
		handle?: import("svelte").Snippet;
		drag?: import("svelte").Snippet;
		hasNote: boolean;
	}

	let {
		task,
		arrowUpHandle = () => true,
		arrowDownHandle = () => true,
		enterHandle = () => true,
		tabHandle = () => true,
		untabHandle = () => true,
		overlay,
		handle,
		drag,
		hasNote = $bindable(),
	}: Props = $props();
	let container: HTMLDivElement;
	let editor: Quill;
	let noteEditor: NoteEditor;

	const events = task.events.$;
	const text = task.text;
	let note = task.note$;
	let isCompleted = task.isCompleted$;
	$effect(() => {
		hasNote = $note?.length > 0;
	});

	let shiftEnterHandle: KeyboardHandler = () => {
		isNoteEditOpen = true;
		return false;
	};

	export const focus = (index: number) => editor.setSelection(index);
	let isNoteEditOpen = $state(false);

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
			handler: warpKeyHandler(arrowUpHandle),
		});
		editor.keyboard.addBinding({
			key: "ArrowDown",
			handler: warpKeyHandler(arrowDownHandle),
		});
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: false,
			handler: warpKeyHandler(enterHandle),
		});
		editor.keyboard.bindings["Enter"].unshift({
			key: "Enter",
			shiftKey: true,
			handler: warpKeyHandler(shiftEnterHandle),
		});
		editor.keyboard.bindings["Tab"].unshift({
			key: "Tab",
			shiftKey: true,
			handler: untabHandle,
		});
		editor.keyboard.bindings["Tab"].unshift({
			key: "Tab",
			shiftKey: false,
			handler: tabHandle,
		});

		const binding = new QuillBinding(text, editor /*, provider.awareness*/);
		return () => {
			binding.destroy();
		};
	});
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

	<div class="flex h-2 flex-row">
		<div class="h-1 w-6"></div>
		{#each $events as event (event.id)}
			<EventIndicator data={event} isCompleted={$isCompleted} />
		{/each}
	</div>

	<Popover.Root bind:open={isNoteEditOpen}>
		<Popover.Trigger>
			<div
				style:padding-left="18px"
				class=" line-clamp-3 text-nowrap whitespace-pre-line text-ellipsis text-start text-zinc-500 w-full"
			>
				{$note}
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
					isNoteEditOpen = false;
					return false;
				}}
				text={task.note}
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
		/* padding-bottom: 2px; */
	}

	:global(.todoitem .ql-container) {
		display: flex;
		flex-grow: 1;
		/* padding-bottom: 2px; */
	}
</style>
