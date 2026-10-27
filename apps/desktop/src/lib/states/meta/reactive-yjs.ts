import { createSubscriber } from "svelte/reactivity";
import * as Y from "yjs";

/**
 * Yjs → Svelte 5 响应式桥接。
 *
 * 每个工厂用 createSubscriber 包装一种 Yjs observe 事件，返回 subscribe 函数：
 * 实体在 getter 中调用 subscribe()，Svelte 渲染时自动注册依赖；
 * Yjs 数据变化时触发 update()，使依赖处重新渲染。
 */

/** 实体级 Y.Map 订阅：自身键值变化即触发更新。 */
export function createYMapSubscriber(yMap: Y.Map<any>): () => void {
  const subscribe = createSubscriber((update) => {
    const handler = () => update();
    yMap.observe(handler);
    return () => yMap.unobserve(handler);
  });
  return subscribe;
}

/** Y.Array 订阅：元素变化即触发更新。 */
export function createYArraySubscriber(yArray: Y.Array<any>): () => void {
  const subscribe = createSubscriber((update) => {
    const handler = () => update();
    yArray.observe(handler);
    return () => yArray.unobserve(handler);
  });
  return subscribe;
}

/** Y.Text 订阅：文本变化即触发更新。 */
export function createYTextSubscriber(yText: Y.Text): () => void {
  const subscribe = createSubscriber((update) => {
    const handler = () => update();
    yText.observe(handler);
    return () => yText.unobserve(handler);
  });
  return subscribe;
}

/** Y.XmlFragment 深度订阅：任意层级嵌套变化均触发更新（用于富文本笔记）。 */
export function createYXmlFragmentDeepSubscriber(
  yXmlFragment: Y.XmlFragment,
): () => void {
  const subscribe = createSubscriber((update) => {
    const handler = () => update();
    yXmlFragment.observeDeep(handler);
    return () => yXmlFragment.unobserveDeep(handler);
  });
  return subscribe;
}

/** 集合级 Y.Map 订阅：语义上关注键集（成员增删）变化，用于顶层 tasks/events Map；实现与 createYMapSubscriber 相同。 */
export function createYMapKeysSubscriber(yMap: Y.Map<any>): () => void {
  const subscribe = createSubscriber((update) => {
    const handler = () => update();
    yMap.observe(handler);
    return () => yMap.unobserve(handler);
  });
  return subscribe;
}
