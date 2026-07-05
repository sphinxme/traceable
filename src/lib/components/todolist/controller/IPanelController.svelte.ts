import type { Task } from "$lib/states/meta/task.svelte";
import type { InteractionContext } from "$lib/interaction/context.svelte";

/**
 * 面板控制器接口。
 *
 * 定义了 `TodoController` 需要从所属面板获取的能力。
 * 由 `EditorPanelController`（`src/lib/panels/PanelController.svelte.ts`）实现。
 *
 * `TodoController` 通过 `this.panel` 访问以下能力：
 * - `id` — 面板唯一标识，用于 `viewId` 生成
 * - `interaction` — 交互上下文（提供 drag / cursor / taskFocus 等服务）
 * - `zoomable()` — 判断当前面板是否支持缩放导航
 * - `pushPaths(childPaths)` — 缩放进入子任务时，将路径推入面包屑导航栈
 */
export interface PanelController {
	/** 面板唯一标识，参与 `viewId` 计算 */
	readonly id: string;
	/** 交互上下文，提供 6 个交互服务 */
	readonly interaction: InteractionContext;
	/** 判断当前面板是否支持缩放导航 */
	zoomable(): boolean;
	/**
	 * 缩放进入子任务时调用，将路径推入面包屑导航栈。
	 * @param childPaths 从 root 到目标 task 的路径数组（不含当前 home task）
	 */
	pushPaths(childPaths: Task[]): void;
}