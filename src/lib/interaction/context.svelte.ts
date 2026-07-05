import { getContext, hasContext, setContext } from "svelte";
import { CursorRestorationService } from "./services/CursorRestorationService.svelte";
import { DragService } from "./services/DragService.svelte";
import { EventHighlightService } from "./services/EventHighlightService.svelte";
import { KeyboardService } from "./services/KeyboardService.svelte";
import { ScrollMemoryService } from "./services/ScrollMemoryService.svelte";
import { TaskFocusService } from "./services/TaskFocusService.svelte";

/**
 * 交互服务容器 — 通过 Svelte Context API 在应用根注入。
 *
 * 各服务职责：
 * | 服务 | 方向 | 职责 |
 * |------|------|------|
 * | `taskFocus` | Week→Todo | 点击 Week Event → 搜索 DAG 定位 Todo → 展开/滚动/高亮 |
 * | `eventHighlight` | Todo→Week | 悬停/点击 Todo EventIndicator → 高亮/滚动 Week EventSegment |
 * | `drag` | — | 拖拽状态，协调跨面板拖放 |
 * | `cursor` | — | 光标恢复（缩放过渡后）+ 键盘导航光标管理 |
 * | `scroll` | — | 各面板滚动位置记忆 |
 * | `keyboard` | — | 全局键盘快捷键 |
 */
export class InteractionContext {
	public readonly drag = new DragService();
	public readonly taskFocus = new TaskFocusService();
	public readonly eventHighlight = new EventHighlightService();
	public readonly cursor = new CursorRestorationService();
	public readonly scroll = new ScrollMemoryService();
	public readonly keyboard = new KeyboardService();

	public onTodoReady() {}

	public destroy() {
		this.drag.destroy();
		this.keyboard.destroy();
	}
}

const KEY = "interactionContext";

export function setInteractionContext(ctx: InteractionContext) {
	setContext<InteractionContext>(KEY, ctx);
}

export function getInteractionContext(): InteractionContext {
	if (!hasContext(KEY)) {
		throw new Error(
			"InteractionContext not set; call setInteractionContext at the app root",
		);
	}
	return getContext<InteractionContext>(KEY);
}
