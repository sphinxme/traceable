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

export function makeViewId(panelId: string, taskId: string, parentViewId?: string): string {
    if (!parentViewId) {
        return `${panelId}-${cyrb53(panelId)}-${taskId}`
    }

    return `${panelId}-${cyrb53(parentViewId)}-${taskId}`
}

// path中的第一个作为root
export function makeViewIdByPaths(panelId: string, paths: string[]): string {
    if (!paths) {
        throw new Error("[makeViewIdByPaths] paths为空")
    }

    return paths.reduce((pre, current) => {
        return makeViewId(panelId, current, pre);
    }, panelId)
}

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