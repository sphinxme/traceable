<script lang="ts">
	/**
	 * TaskDropable — 拖放目标区域组件。
	 *
	 * 在 `TodoList` 中每个子条目前后插入，作为拖放的放置目标。
	 * 仅在 `drag.active`（全局拖拽进行中）时渲染检测区域。
	 *
	 * **交互**：
	 * - `ondragover` → `dragOverMe(metaKey)` 返回 dropEffect，控制鼠标样式
	 * - `ondrop` → `dropIntoMe(metaKey, index)` 执行 reparenting
	 * - `ondragenter/leave` → 控制 `hovering` 状态，显示/隐藏指示条
	 *
	 * **指示条**：hover 时显示灰色横条（`::after` 伪元素），高度变化使用过渡动画。
	 *
	 * **z-index**：使用 `controller.depth` 确保深层嵌套的拖放区域在上层。
	 *
	 * @prop controller - TodoController（拖放目标所属的控制器）
	 * @prop index - 插入位置索引
	 * @prop topTaskId - 上方相邻任务的 ID（可选）
	 * @prop bottomTaskId - 下方相邻任务的 ID（可选）
	 */
	import hotkeys from "hotkeys-js";
	import type { TodoController } from "../controller/TodoController.svelte";
	import { eventbus } from "../controller/eventbus.svelte";
	import { getInteractionContext } from "$lib/interaction/context.svelte";

	interface Props {
		controller: TodoController;
		index: number;
		topTaskId?: string | undefined;
		bottomTaskId?: string | undefined;
	}

	let { controller, index }: Props = $props();

	const { drag, keyboard } = getInteractionContext();

	let hovering = $state(false);
	$effect(() => {
		const setHoverFalse = () => {
			hovering = false;
		};
		eventbus.on("drag:end", setHoverFalse);
		return () => {
			eventbus.off("drag:end", setHoverFalse);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class=" relative transition-height w-full duration-300 {hovering
		? 'h-2'
		: 'h-0'}"
>
	<!-- 拖拽检测区域(超出上方的relative范围) -->
	{#if drag.active}
		<div
			class:hovering
			class=" absolute -bottom-1.5 -top-3 flex w-full flex-col items-center justify-center"
			ondragover={(event) => {
				event.preventDefault();

				if (event.dataTransfer) {
					event.dataTransfer.dropEffect =
						controller.dragDropActions.dragOverMe(keyboard.metaKey);
					if (event.dataTransfer.dropEffect === "none") {
						hovering = false;
					}
				}
			}}
			ondrop={(event) => {
				event.preventDefault();
				console.log({ m: hotkeys.modifier });
				controller.dragDropActions.dropIntoMe(keyboard.metaKey, index);
			}}
			ondragenter={() => (hovering = true)}
			ondragleave={() => (hovering = false)}
			style:z-index={controller.depth}
		></div>
	{/if}
</div>

<style>
	/* 指示器 */
	.hovering::after {
		position: absolute;
		content: "";
		height: 4px;
		width: 100%;
		/* left: rem; */
		right: 4px;
		border-radius: 0.5rem;
		background-color: gray;
		opacity: 20%;
	}
</style>
