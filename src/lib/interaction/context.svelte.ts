/**
 * 交互服务层 — 通过 Svelte Context API 在应用根注入的交互服务集合。
 *
 * ## 使用方式
 *
 * 在 `App.svelte` 中创建并注入：
 * ```ts
 * const interaction = new InteractionContext();
 * setInteractionContext(interaction);
 * ```
 *
 * 在任意子组件中获取：
 * ```ts
 * const interaction = getInteractionContext();
 * interaction.drag.set(...);
 * ```
 */
import { getContext, hasContext, setContext } from "svelte";
import { CursorRestorationService } from "./services/CursorRestorationService.svelte";
import { DragService } from "./services/DragService.svelte";
import { EventHighlightService } from "./services/EventHighlightService.svelte";
import { KeyboardService } from "./services/KeyboardService.svelte";
import { ScrollMemoryService } from "./services/ScrollMemoryService.svelte";
import { TaskFocusService } from "./services/TaskFocusService.svelte";

/**
 * 交互服务容器 — 通过 Svelte Context API 在应用根注入。
 * 各服务的职责见字段注释。
 */
export class InteractionContext {
	/** 拖拽状态，协调跨面板拖放 */
	public readonly drag = new DragService();
	/** Week→Todo：点击 Week Event → 搜索 DAG 定位 Todo → 展开/滚动/高亮 */
	public readonly taskFocus = new TaskFocusService();
	/** Todo→Week：悬停/点击 Todo EventIndicator → 高亮/滚动 Week EventSegment */
	public readonly eventHighlight = new EventHighlightService();
	/** 光标恢复（插入 / Tab 移动 / 缩放过渡后） */
	public readonly cursor = new CursorRestorationService();
	/** 各面板滚动位置记忆 */
	public readonly scroll = new ScrollMemoryService();
	/** Meta 键状态追踪 */
	public readonly keyboard = new KeyboardService();

	public onTodoReady() {}

	public destroy() {
		this.drag.destroy();
		this.keyboard.destroy();
	}
}

const KEY = "interactionContext";

/**
 * 在应用根注入交互服务容器。
 *
 * @param ctx 交互服务容器实例
 */
export function setInteractionContext(ctx: InteractionContext) {
	setContext<InteractionContext>(KEY, ctx);
}

/**
 * 获取已注入的交互服务容器。
 *
 * 必须在 {@link setInteractionContext} 之后调用，否则抛出错误。
 *
 * @returns 交互服务容器实例
 */
export function getInteractionContext(): InteractionContext {
	if (!hasContext(KEY)) {
		throw new Error(
			"InteractionContext not set; call setInteractionContext at the app root",
		);
	}
	return getContext<InteractionContext>(KEY);
}
