import { settled } from "svelte";

/**
 * 等待「Yjs 事务 → 响应式传播 → 组件挂载/卸载 → 条目实例的登记/注销」全部完成。
 * 需要读取 Registry、按地址找回条目实例、恢复焦点或命名过渡目标时，先 await settle()。
 */
export const settle: () => Promise<void> = settled;
