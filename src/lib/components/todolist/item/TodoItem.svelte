<script lang="ts">
	import 'quill/dist/quill.core.css';
	import Quill from 'quill';
	import { QuillBinding } from 'y-quill';
	import { getContext, onDestroy, onMount } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';

	import { warpKeyHandler, type KeyboardHandler } from './model';
	import { type Database, id } from '$lib/states/db';
	import EventIndicator from './event/EventIndicator.svelte';
	import NoteEditor from './note/NoteEditor.svelte';
	import Overlay from './overlay/Overlay.svelte';
	import { LastOneEmptyStatusKey, type LastOneEmptyStatus } from '$lib/states/types';

	let container: HTMLDivElement;
	let editor: Quill;

	let db: Database = getContext('db');
	export let task: {
		id: string;
		textId: string;
		noteId: string;
		isCompleted: boolean;
	};
	let isCompleted = task.isCompleted;

	const eventQuery = db.instant.useQuery({ events: { $: { where: { 'task.id': task.id } } } });
	if ($eventQuery.error) {
		throw new Error($eventQuery.error.message);
	}
	$: events = $eventQuery.data?.events || [];

	const text = db.texts.get(task.textId);
	if (!text) {
		throw new Error(`unknown textId:${task.textId}`);
	}
	// const noteText = db.getNoteStore(noteId)
	const rawNote = db.notes.get(task.noteId);
	if (!rawNote) {
		throw new Error(`unknown noteId:${task.noteId}`);
	}
	let note = rawNote.toJSON();
	const noteObserver = () => (note = rawNote.toJSON());
	rawNote.observe(noteObserver);
	onDestroy(() => {
		rawNote.unobserve(noteObserver);
	});

	export let arrowUpHandle: KeyboardHandler = () => true;
	export let arrowDownHandle: KeyboardHandler = () => true;
	export let enterHandle: KeyboardHandler = () => true;
	let shiftEnterHandle: KeyboardHandler = () => {
		// 弹出
		openNoteEdit = true;
		return false;
	};

	export const focus = (index: number) => editor.setSelection(index);

	// const emit = createEventDispatcher<{
	//     "arrowUp": KeyboardEvent
	// }>();
	// Quill.register("modules/cursors", QuillCursors);
	let openNoteEdit = false;

	onMount(() => {
		editor = new Quill(container, {
			modules: {
				toolbar: false
			},
			theme: 'bubble',
			placeholder: 'placeholder'
		});
		editor.keyboard.addBinding({
			key: 'ArrowUp',
			handler: warpKeyHandler(arrowUpHandle)
		});
		editor.keyboard.addBinding({
			key: 'ArrowDown',
			handler: warpKeyHandler(arrowDownHandle)
		});
		editor.keyboard.bindings['Enter'].unshift({
			key: 'Enter',
			shiftKey: false,
			handler: warpKeyHandler(enterHandle)
		});
		editor.keyboard.bindings['Enter'].unshift({
			key: 'Enter',
			shiftKey: true,
			handler: warpKeyHandler(shiftEnterHandle)
		});
		editor.keyboard.addBinding({
			key: 'Tab',
			handler(range, curContext, binding) {
				console.log('tab');
			}
		});

		const binding = new QuillBinding(text, editor /*, provider.awareness*/);

		const onTextChange = () => {
			isLastOneEmpty.set(text.length === 0);
		};
		onTextChange();
		text.observe(onTextChange);
		return () => {
			text.unobserve(onTextChange);
		};
	});

	const isLastOneEmpty = getContext<LastOneEmptyStatus>(LastOneEmptyStatusKey).isLastOneEmpty;
</script>

<div class="group flex flex-col">
	<!-- 一整个横条 -->
	<div class=" relative w-full">
		<div class="flex w-full flex-row items-center">
			<Overlay><slot name="overlay"></slot></Overlay>
			<div class="flex w-full flex-row items-center">
				<slot name="handle"></slot>
				<div
					style:font-size="large"
					style:text-decoration={isCompleted ? 'line-through' : ''}
					style:opacity={isCompleted ? 0.5 : 1}
					bind:this={container}
				/>
			</div>
		</div>
		<slot name="drag" />
	</div>
	<!-- 横条下面的东西 -->

	<div class="flex h-2 flex-row">
		<div class="h-1 w-6" />
		{#if !$eventQuery.isLoading}
			{#each events as data (data.id)}
				<EventIndicator {data} />
			{/each}
		{/if}
	</div>

	<Popover.Root bind:open={openNoteEdit}>
		<Popover.Trigger>
			<div class=" text-start text-slate-500">{note}</div>
		</Popover.Trigger>
		<Popover.Content align="start">
			<NoteEditor text={rawNote} />
		</Popover.Content>
	</Popover.Root>
</div>

<style>
	:global(.ql-editor) {
		padding-top: 0px;
		padding-bottom: 0px;
		/* padding-top: 12px; */
		padding-left: 15px;
		padding-right: 15px;
		width: 100%;
		flex-grow: 1;
		/* padding-bottom: 2px; */
	}

	:global(.ql-container) {
		display: flex;
		flex-grow: 1;
		/* padding-bottom: 2px; */
	}
</style>
