

export interface DragingTaskData {
    draggingTaskId: string;
    originParentId: string;
    originIndexInParent: number;
}

export function isCopy(altKey: boolean, fromPanelId: string, toPanelId: string) {
    const isSamePanel = fromPanelId === toPanelId;
    const shouldCopy = !isSamePanel
    return altKey ? !shouldCopy : shouldCopy
}