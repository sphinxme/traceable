<script lang="ts">
	/**
	 * TodoItem — 条目渲染组件（标题编辑器 + 事件指示 + 笔记）。
	 *
	 * 渲染结构：
	 * ```
	 * TodoItem
	 * ├── Overlay（叠加层容器：折叠按钮等）
	 * ├── Handle（拖拽手柄，由 snippet 传入）
	 * ├── Quill 编辑器（标题文本，通过 y-quill 绑定到 Yjs Y.Text）
	 * ├── EventIndicator[]（日历事件指示器，按时间排序）
	 * └── NoteEditor（笔记编辑器，Popover 弹出，ProseKit）
	 * ```
	 *
	 * **键盘绑定**：在 `onMount` 中注册 Quill 键盘绑定：
	 * - ArrowUp / ArrowDown → `keyboardActions.navigateUp/Down`
	 * - Enter → `keyboardActions.enter`（4种case）
	 * - Shift+Enter → `keyboardActions.shiftEnter`（笔记开关）
	 * - Tab / Shift+Tab → `keyboardActions.tab/untab`
	 *
	 * **焦点回调**：`focusActions.onfocus` 被赋值为 `editor.setSelection(cursorIndex, 0)`。
	 *
	 * **View Transition**：`$titleViewTransitionName` 用于缩放时的标题形变动画。
	 *
	 * @prop controller - TodoController
	 * @prop overlay - 可选的叠加层 snippet（折叠按钮等）
	 * @prop handle - 可选的拖拽手柄 snippet
	 * @prop drag - 可选的拖拽区域 snippet
	 */
	import "quill/dist/quill.core.css";
	import Quill from "quill";
	import { QuillBinding } from "y-quill";
	import { onMount } from "svelte";
	import * as Popover from "$lib/components/ui/popover";
	// db 是全局模块单例（src/state.ts），这里导入以获取 db.doc（中央 Y.Doc）
	// NoteEditor 需要显式接收 doc + fragment，与 defineYjs 签名 1:1 对应
	import { db } from "@/state";

	import EventIndicator from "./event/EventIndicator.svelte";
	import NoteEditor from "./note/NoteEditor.svelte";
	import Overlay from "./overlay/Overlay.svelte";
	import type { TodoController } from "../controller/TodoController.svelte";

	interface Props {
		controller: TodoController;
		overlay?: import("svelte").Snippet;
		handle?: import("svelte").Snippet;
		drag?: import("svelte").Snippet;
	}

	let { controller, overlay, handle, drag }: Props = $props();
	let container: HTMLDivElement;
	let editor: Quill;
	// NoteEditor 通过 bind:this 暴露 editor 实例，调用方通过 .editor.focus() 访问
	let noteEditor: { editor: { focus: () => void } };

	let sortedEvents = $derived(
		[...controller.task.events].sort((a, b) => a.start - b.start),
	);
	let isCompleted = $derived(controller.task.isCompleted);
	let note = $derived(controller.task.$note);

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
					style:text-decoration={isCompleted ? "line-through" : ""}
					style:opacity={isCompleted ? 0.5 : 1}
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
			<EventIndicator data={event} {isCompleted} />
		{/each}
	</div>

	<Popover.Root bind:open={controller.noteEditOpen}>
		<Popover.Trigger>
			<div
				style:padding-left="18px"
				style:transition-property="margin"
				class=" {controller.task.events.isEmpty()
					? '-mt-1'
					: ''}  line-clamp-3 text-nowrap whitespace-pre-line text-ellipsis text-start text-zinc-500 w-full transition"
			>
				{note}
			</div>
		</Popover.Trigger>
		<Popover.Content
			onOpenAutoFocus={(e) => {
				e.preventDefault();
				noteEditor.editor.focus();
			}}
			onCloseAutoFocus={(e) => {
				e.preventDefault();
				editor.focus();
			}}
			align="start"
		>
			<NoteEditor
				bind:this={noteEditor}
				doc={db.doc}
				fragment={controller.task.noteDoc}
				onClose={() => {
					controller.noteEditOpen = false;
					return false;
				}}
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
