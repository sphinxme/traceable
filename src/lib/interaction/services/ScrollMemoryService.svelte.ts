/**
 * 单个面板的滚动位置快照。
 *
 * @property scrollTop  垂直滚动偏移
 * @property scrollLeft 水平滚动偏移
 */
export interface ScrollState {
	scrollTop: number;
	scrollLeft: number;
}

/**
 * 滚动位置记忆服务 — 记忆各面板的滚动位置，切换时恢复。
 *
 * 按面板类型分别存储，每个面板以 `Record<key, ScrollState>` 形式保存，
 * key 由调用方定义（通常为视图 ID 或面板标识）。
 */
export class ScrollMemoryService {
	public journal: Record<string, ScrollState> = {};
	public weekPanel: Record<string, ScrollState> = {};
	public editorPanel: Record<string, ScrollState> = {};
}
