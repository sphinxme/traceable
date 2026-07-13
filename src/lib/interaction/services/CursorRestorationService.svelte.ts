/**
 * Insert 协议的 pending 状态 — Enter 创建新 Todo 后聚焦到新行。
 */
interface PendingInsert {
	viewId: string;
	cursorIndex: number;
}

/**
 * Tab 协议的 pending 状态 — Tab/Untab 移动 Todo 后聚焦到移动后的行。
 */
interface PendingTab {
	originViewId: string;
	nextViewId: string;
	cursorIndex: number;
}

/**
 * 光标恢复服务 — 在结构性变更（插入 / Tab 移动 / 缩放过渡）后恢复光标位置。
 *
 * 三套独立的协议，各自维护 pending 状态：
 *
 * | 协议 | 触发场景 | 方法 |
 * |------|----------|------|
 * | Insert | Enter 创建新 Todo → 聚焦到新行 | {@link requestFocusInsert} / {@link consumeFocusInsert} |
 * | Tab | Tab/Untab 移动 Todo → 聚焦到移动后的行 | {@link startTab} / {@link endTab} / {@link isTabbing} / {@link consumeTabCursor} |
 * | Zoom | 缩放过渡（zoom-out / zoom-in） | {@link startZoomout} / {@link endZoomout} / {@link startZoominto} / {@link endZoominto} / {@link isZoomingOut} |
 *
 * Insert / Tab 协议采用"命中即消费"模式：匹配 viewId 时返回 cursorIndex 并清空 pending。
 * Zoom 协议仅做状态存储，实际的 transition-name 广播由事件驱动。
 */
export class CursorRestorationService {
	private pendingInsert: PendingInsert | undefined;
	private pendingTab: PendingTab | undefined;
	private zoomingViewId: string = "";

	// === Insert protocol (Enter → focus newly created todo) ===
	public requestFocusInsert(viewId: string, cursorIndex: number) {
		this.pendingInsert = { viewId, cursorIndex };
	}

	// 命中即消费:匹配 viewId 时返回 cursorIndex 并清空 pending,否则 undefined
	public consumeFocusInsert(viewId: string): number | undefined {
		if (this.pendingInsert && this.pendingInsert.viewId === viewId) {
			const idx = this.pendingInsert.cursorIndex;
			this.pendingInsert = undefined;
			return idx;
		}
		return undefined;
	}

	// === Tab protocol (Tab/Untab → focus newly-moved todo) ===
	public startTab(
		originViewId: string,
		nextViewId: string,
		cursorIndex: number,
	) {
		this.pendingTab = { originViewId, nextViewId, cursorIndex };
	}

	public endTab(nextViewId: string) {
		if (this.pendingTab && this.pendingTab.nextViewId === nextViewId) {
			this.pendingTab = undefined;
		}
	}

	public isTabbing(viewId: string): boolean {
		return this.pendingTab?.nextViewId === viewId;
	}

	// 命中即消费 cursor,不删 pending(等 endTab 触发清空)
	public consumeTabCursor(viewId: string): number | undefined {
		if (this.pendingTab && this.pendingTab.nextViewId === viewId) {
			return this.pendingTab.cursorIndex;
		}
		return undefined;
	}

	// === Zoom protocol (storage only; events still drive transition-name broadcast) ===
	public startZoomout(nextViewId: string) {
		this.zoomingViewId = nextViewId;
	}

	public endZoomout(nextViewId: string) {
		if (this.zoomingViewId === nextViewId) {
			this.zoomingViewId = "";
		}
	}

	public startZoominto(futureViewId: string) {
		this.zoomingViewId = futureViewId;
	}

	public endZoominto(futureViewId: string) {
		if (this.zoomingViewId === futureViewId) {
			this.zoomingViewId = "";
		}
	}

	public isZoomingOut(viewId: string): boolean {
		return this.zoomingViewId === viewId;
	}
}
