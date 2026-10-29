import { untrack } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import type { OccurrenceRef } from "$lib/protocol";
import { devAssert } from "$lib/utils";
import type { ViewHandle } from "./view-handle.svelte";

/**
 * ViewRegistry：每面板一份的挂载索引。
 *
 * 三处索引（handle.parent.children / #byTask / #roots）的唯一写者（G4）。
 * 只含【已挂载】出现——折叠子树天然不可见；「可能显示在哪」走 Panel.findOccurrencePaths。
 *
 * 读取纪律（G7）：只发生在 settle() 之后 / vt.finished 之后。
 */
export class ViewRegistry {
  readonly #panelId: string;
  /** homeId → 根条目实例（每个 home 一棵树的根；SvelteMap 响应式，currentHomeHandle 的派生底座）。 */
  #roots = new SvelteMap<string, ViewHandle>();
  /** taskId → 已挂载出现集（调试/扩展查询；无响应消费者，纯 Map）。 */
  #byTask = new Map<string, Set<ViewHandle>>();

  constructor(panelId: string) {
    this.#panelId = panelId;
  }

  // —— 唯一写者（G4）——

  register(handle: ViewHandle): void {
    // 写 API：注册发生在组件 $effect 内，绝不能把索引读变成该 effect 的依赖
    // （否则 SvelteMap 的 set 会触发自身 effect 重跑 → cleanup 误注销）。
    untrack(() => {
      if (handle.parent) {
        devAssert(
          !handle.parent.children.has(handle.task.id),
          `ViewRegistry(${this.#panelId}): duplicate mount of ${handle.task.id}`,
        );
        handle.parent.children.set(handle.task.id, handle);
      } else {
        devAssert(
          !this.#roots.has(handle.task.id),
          `ViewRegistry(${this.#panelId}): duplicate root ${handle.task.id}`,
        );
        this.#roots.set(handle.task.id, handle);
      }

      let handles = this.#byTask.get(handle.task.id);
      if (!handles) {
        handles = new Set();
        this.#byTask.set(handle.task.id, handles);
      }
      handles.add(handle);
    });
  }

  unregister(handle: ViewHandle): void {
    untrack(() => {
      if (handle.parent) {
        if (handle.parent.children.get(handle.task.id) === handle) {
          handle.parent.children.delete(handle.task.id);
        }
      } else {
        devAssert(
          handle.children.size === 0,
          `ViewRegistry(${this.#panelId}): root ${handle.task.id} unregistered before children`,
        );
        if (this.#roots.get(handle.task.id) === handle) {
          this.#roots.delete(handle.task.id);
        }
      }

      const handles = this.#byTask.get(handle.task.id);
      if (handles) {
        handles.delete(handle);
        if (handles.size === 0) this.#byTask.delete(handle.task.id);
      }
    });
  }

  // —— 查询（只读）——

  roots(): ViewHandle[] {
    return [...this.#roots.values()];
  }

  root(homeId: string): ViewHandle | undefined {
    return this.#roots.get(homeId);
  }

  handlesOf(taskId: string): ViewHandle[] {
    return [...(this.#byTask.get(taskId) ?? [])];
  }

  /** 地址 → 条目实例；折叠/未挂载/失效一律 miss（undefined），绝不命中错误节点。 */
  resolve(ref: OccurrenceRef): ViewHandle | undefined {
    devAssert(
      ref.panelId === this.#panelId,
      `ViewRegistry(${this.#panelId}): resolve for foreign panel ${ref.panelId}`,
    );
    let handle = this.#roots.get(ref.homeId);
    for (const taskId of ref.path) {
      handle = handle?.children.get(taskId);
    }
    return handle;
  }

  resolveChild(parent: ViewHandle, taskId: string): ViewHandle | undefined {
    return parent.children.get(taskId);
  }
}
