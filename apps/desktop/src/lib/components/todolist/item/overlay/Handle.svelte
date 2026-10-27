<script lang="ts">
	/**
	 * Handle — 拖拽手柄组件。
	 *
	 * 在 TodoItem 中显示为一个圆形状态指示点，支持：
	 * - **点击** → 缩放进入（`controller.zoomInto()`）
	 * - **拖拽** → 触发拖放操作（`dragDropActions.startDrag/endDrag`）
	 * - **右键** → 上下文菜单（删除等，由 `Todo.svelte` 中的 ContextMenu 包裹）
	 *
	 * **状态圆点**：根据 `status` 显示不同颜色（TODO: 灰色, BLOCK: 蓝色, DONE: 浅灰）。
	 *
	 * **扩展面板**（已注释）：hover 时可展开状态切换面板（TODO/BLOCK/DONE）。
	 *
	 * @prop taskId - 任务 ID（用于 data-task-id 属性）
	 * @prop status - 任务状态（默认 "TODO"）
	 * @prop onclick - 点击回调
	 * @prop ondragstart - 拖拽开始回调
	 * @prop ondragend - 拖拽结束回调
	 * @prop onmousedown - 鼠标按下回调
	 */
	// import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
	import type { MouseEventHandler } from "svelte/elements";
	import { colors } from "./colors";

	interface Props {
		taskId: string;
		status?: "TODO" | "BLOCK" | "DONE";
		onclick: MouseEventHandler<HTMLDivElement>;
		ondragstart: MouseEventHandler<HTMLDivElement>;
		ondragend: MouseEventHandler<HTMLDivElement>;
		onmousedown: MouseEventHandler<HTMLDivElement>;
	}

	let {
		taskId,
		onclick,
		status = "TODO",
		ondragstart,
		ondragend,
		onmousedown,
	}: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
	role="button"
	{onclick}
	{ondragstart}
	{ondragend}
	{onmousedown}
	draggable="true"
	data-task-id={taskId}
	class="handle relative flex items-center justify-center"
>
	<span
		class=" plate absolute h-5 w-5 rounded-full bg-zinc-300 opacity-0 duration-300 group-hover:opacity-60"
		style:z-index="5"
	>
		<div
			class="extra-panel flex transition ease-in-out justify-stretch items-stretch absolute rounded-full bg-zinc-300 left-0 h-5 w-0 overflow-hidden duration-300"
			style:z-index="8"
			style:transition-property="width"
		>
			<div class="w-5 flex-shrink-0"></div>
			<div
				class="toggle flex flex-grow justify-stretch items-stretch text-zinc-700 font-bold text-xs"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- <ToggleGroup.Root type="single">
					<ToggleGroup.Item value="a">TODO</ToggleGroup.Item>
					<ToggleGroup.Item value="b">DONE</ToggleGroup.Item>
					<ToggleGroup.Item value="c">BLOCK</ToggleGroup.Item>
				</ToggleGroup.Root> -->

				<!-- <div
					class="my-1 px-1 rounded-full bg-zinc-500 text-white"
					style:font-size="0.5rem"
					onclick={() => console.log("todo")}
				>
					TODO
				</div>
				<div
					class="my-1 px-1 rounded-full align-middle bg-blue-300"
					style:font-size="0.5rem"
					onclick={() => console.log("block")}
				>
					BLOCK
				</div>
				<div
					class="my-1 px-1 rounded-full bg-zinc-100"
					style:font-size="0.5rem"
					onclick={() => console.log("done")}
				>
					DONE
				</div> -->
			</div>
		</div>
	</span>
	<span class={` z-10 h-2 w-2 rounded-full ${colors[status]}`}></span>
</div>

<style>
	.handle:active .extra-panel {
		width: 0rem;
		height: 0%;
		display: none;
	}
	/* .extra-panel:active {
		display: none;
	} */
	/* .handle:hover .extra-panel {
		transition-delay: 300ms;
		width: 15rem;
		height: 100%;
	} */
	/* .handle:hover .plate {
		transition-delay: 300ms;
		opacity: 1;
	} */

	/* 以下废弃 */

	/* .extra-panel:hover {
		width: 15rem;
	} */

	/* .extra-panel:hover {
		display: flex;
		width: 15rem;
		padding-right: 0.4rem;
	}

	.extra-panel:hover .toggle {
		display: flex;
	}
	.toggle:hover .toogleT {
		display: block;
	} */
</style>
