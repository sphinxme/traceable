/**
 * 断言变量不为空（非 null 且非 undefined），否则抛出错误
 * @param value 要检查的值
 * @param message 自定义错误信息（可选）
 */
export function assertNotEmpty<T>(
    value: T,
    message?: string
): asserts value is NonNullable<T> {
    if (value == null) {
        throw new Error(message ?? `Expected value to be non-empty, but got ${value}`);
    }
}

/**
 * 生成唯一的视图标识 `viewId`。
 *
 * `viewId` 是整个 todolist 架构的关键标识，由 `panelId` + 父 `viewId` 哈希 + `taskId` 组合而成。
 * 用于：
 * - 滚动位置记忆（`ScrollMemoryService` 按 `panelId + viewId` 存储）
 * - 光标恢复（`CursorRestorationService` 按 viewId 匹配）
 * - View Transition 动画命名（`todoView_${viewId}` 等）
 * - 事件总线中的视图标识
 * - `TaskFocusService` 的视图注册与 DAG 路径查找
 *
 * @param panelId 面板唯一标识
 * @param taskId 任务唯一标识
 * @param parentViewId 父级 viewId（可选，不传则为根级 viewId）
 * @returns 格式为 `${panelId}-${hash(parentViewId|panelId)}-${taskId}` 的 viewId
 */
export function makeViewId(panelId: string, taskId: string, parentViewId?: string): string {
    if (!parentViewId) {
        return `${panelId}-${cyrb53(panelId)}-${taskId}`
    }

    return `${panelId}-${cyrb53(parentViewId)}-${taskId}`
}

/**
 * 根据面包屑路径数组生成 viewId。
 *
 * path 中的第一个 taskId 作为 root，依次向下拼接。
 * 用于 `TaskFocusService.focusTask` 中根据路径计算目标 viewId，
 * 以及 `EditorPanelController` 中计算缩放后的 home viewId。
 *
 * @param panelId 面板唯一标识
 * @param paths 从 root 到目标 task 的 taskId 路径数组
 * @returns 目标 task 的 viewId
 */
export function makeViewIdByPaths(panelId: string, paths: string[]): string {
    if (!paths) {
        throw new Error("[makeViewIdByPaths] paths为空")
    }

    return paths.reduce((pre, current) => {
        return makeViewId(panelId, current, pre);
    }, panelId)
}

/**
 * cyrb53 哈希函数 — 生成 53-bit 整数哈希。
 *
 * 用于 `makeViewId` 中对 panelId / parentViewId 进行哈希，
 * 保证 viewId 的唯一性同时避免过长。
 *
 * @param str 输入字符串
 * @param seed 随机种子（默认 0）
 * @returns 53-bit 整数哈希值
 */
function cyrb53(str: string, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    // 返回一个 53-bit 的整数
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};