/// 全局复用的 光标位置缓存
/// 当TodoItem增加缩进/取消缩进时, 会触发Task.svelte的重新加载, 为了避免光标位置丢失, 临时存在这里

import type { TaskProxy } from "../meta/task.svelte";

/**
 * 定义焦点状态的接口
 */
export interface FocusState {
    /**
     * 面板ID
     */
    panelId: string | null;
    /**
     * 目标task路径
     */
    focusPath: TaskProxy[] | null;
    /**
     * 编辑器中的光标位置
     */
    index: number | null;
}


const focusState: FocusState = {
    panelId: null,
    focusPath: null,
    index: 0,
};

/**
 * 设置焦点状态
 * @param panelId - 面板ID
 * @param path - 任务代理对象数组，表示焦点路径
 */
export function setFocusState(panelId: string, path: TaskProxy[] | null, index: number | null) {
    focusState.panelId = panelId;
    focusState.focusPath = path;
    focusState.index = index;
}

export function consumeFocusState(panelId: string, focusPath: TaskProxy[] | null) {
    if (panelId !== focusState.panelId) {
        return null;
    }

    // 检查两个数组是否为空
    if (!focusPath && !focusState.focusPath) {
        return null;
    }
    if (!focusPath || !focusState.focusPath) {
        return null;
    }
    // 检查数组长度是否相同
    if (focusPath.length !== focusState.focusPath.length) {
        return null;
    }
    // 比较数组中每个元素的id是否相同
    for (let i = 0; i < focusPath.length; i++) {
        if (focusPath[i].id !== focusState.focusPath[i].id) {
            return null;
        }
    }

    const index = focusState.index
    focusState.panelId = null;
    focusState.focusPath = null;
    focusState.index = 0;
    return index;
}