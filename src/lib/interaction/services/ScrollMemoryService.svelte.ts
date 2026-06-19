export interface ScrollState {
	scrollTop: number;
	scrollLeft: number;
}

export class ScrollMemoryService {
	public journal: Record<string, ScrollState> = {};
	public weekPanel: Record<string, ScrollState> = {};
	public editorPanel: Record<string, ScrollState> = {};
}
