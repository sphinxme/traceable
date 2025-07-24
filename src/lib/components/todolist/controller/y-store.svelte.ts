
import type * as Y from 'yjs';

/**
 * 一个类似 Svelte Rune/Store 的对象，其 `.value` 属性可以被响应式地读写。
 * @template T - 存储的值的类型。
 */
export interface YRune<T> {
  value: T;
}

/**
 * 创建一个与 Y.Map 中特定 key 双向绑定的 Svelte 5 rune-like store。
 *
 * 这个函数是类型安全的。如果你为 Y.Map 提供了类型参数，
 * 那么 key 的值和默认值都必须符合该类型。
 *
 * @template V - Y.Map 存储的值的类型。
 * @template K - Y.Map 中的具体 key，是 V 的属性名。
 * @param {Y.Map<V>} yMap - Y.js 的 Map 实例。
 * @param {K} key - 你想要绑定的 Map 中的 key。
 * @param {V[K]} defaultValue - 当 key 在 Y.Map 中不存在时的默认值。
 * @returns {YRune<V[K]>} - 一个拥有 .value 属性的对象，可以像 rune 一样读写。
 */
export function createYMapKeyStore<V extends object, K extends keyof V>(
  yMap: Y.Map<V>,
  key: K,
  defaultValue: V[K]
): YRune<V[K]> {
  // 1. 初始化 Svelte 状态
  // 从 Y.Map 获取初始值，如果不存在，则使用提供的默认值。
  // `yMap.get(key as string)` 是因为 Y.Map 的 key 类型是 string，而我们的 K 是 keyof V。
  // `??` 操作符确保即使 Y.Map 中存的是 `false` 或 `0` 也能正确获取。
  let storeValue = $state<V[K]>(yMap.get(key as string) ?? defaultValue);

  // 2. Y.js -> Svelte 的同步
  $effect(() => {
    const observer = (event: Y.YMapEvent<V>) => {
      // 检查我们关心的 key 是否发生了变化
      if (event.keysChanged.has(key as string)) {
        console.log(`[Y.js -> Svelte] Key '${String(key)}' changed. Updating state.`);
        // 从 Y.Map 获取最新的值并更新 Svelte 状态
        storeValue = yMap.get(key as string) ?? defaultValue;
      }
    };

    yMap.observe(observer);

    // $effect 的清理函数：当组件销毁时，移除监听器以防止内存泄漏。
    return () => {
      yMap.unobserve(observer);
    };
  });

  // 3. Svelte -> Y.js 的同步
  $effect(() => {
    // 为了防止无限循环，我们只在 Svelte 状态和 Y.Map 状态不一致时才进行写操作。
    if (storeValue !== yMap.get(key as string)) {
      console.log(`[Svelte -> Y.js] State changed. Updating Y.Map for key '${String(key)}'.`);

      // 如果 Svelte 状态是 undefined 或 null，我们应该从 Y.Map 中删除这个 key
      // 这是为了保持与 Y.js 的行为一致性，因为 `yMap.get()` 对不存在的键返回 `undefined`。
      // 注意：如果你的业务逻辑允许存储 null，则需要调整此处的判断。
      if (storeValue === undefined || storeValue === null) {
        yMap.delete(key as string);
      } else {
        // 否则，设置新的值
        yMap.set(key as string, storeValue);
      }
    }
  });

  // 4. 返回一个符合 YRune<T> 接口的、带有 getter 和 setter 的对象
  return {
    get value() {
      return storeValue;
    },
    set value(newValue: V[K]) {
      storeValue = newValue;
    },
  };
}
