/**
 * 测试用响应式探针：在 effect root 内记录 read() 的每次求值，可手动 flushSync。
 * 用于验证 createSubscriber / SvelteMap 等响应式桥接，不依赖组件树挂载。
 */
import { flushSync } from "svelte";
export function createProbe<T>(read: () => T) {
  const values: T[] = [];
  const stop = $effect.root(() => {
    $effect(() => {
      values.push(read());
    });
  });
  flushSync();
  return {
    values,
    flush: () => flushSync(),
    stop,
  };
}
