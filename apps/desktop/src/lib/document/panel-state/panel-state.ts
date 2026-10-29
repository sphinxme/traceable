import * as Y from "yjs";
import type { Store } from "$lib/document/entities/store.svelte";
import {
  createYMapKeysSubscriber,
  createYMapSubscriber,
} from "$lib/document/entities/reactive-yjs";
import { FoldTree } from "./fold-tree";

/**
 * app 单例：`panelStates` Y.Map 的顶层入口。
 *
 * Yjs 终态布局：
 * ```
 * panelStates: Y.Map
 *   └─ <panelId>: Y.Map                  # PanelStateEntry
 *        ├─ "nav": string[]              # 仅编辑器面板
 *        └─ "homes": Y.Map
 *             └─ <homeId>: Y.Map         # FoldNode；根节点 = home task 自身
 *                  ├─ "folded": boolean
 *                  └─ <childTaskId>: Y.Map   # 递归 FoldNode
 * ```
 *
 * - 折叠节点懒创建：默认不存在 = 展开，因此迁移/GC 天然稀疏；
 * - 根 FoldNode 的 folded 无意义（根列表恒显示），保留只为路径行走统一；
 * - 保留键仅 `nav` / `homes` / `folded`，`id()` 生成的 taskId 不会与之碰撞。
 */
export class PanelState {
  private readonly subscribePanelStates: () => void;

  constructor(private readonly store: Store) {
    this.subscribePanelStates = createYMapKeysSubscriber(
      this.store.panelStates,
    );
  }

  /** 取（懒建）某面板的 entry；响应式：panelStates 键集变化触发更新。 */
  entry(panelId: string): PanelStateEntry {
    this.subscribePanelStates();
    let yMap = this.store.panelStates.get(panelId);
    if (!(yMap instanceof Y.Map)) {
      yMap = new Y.Map();
      this.store.panelStates.set(panelId, yMap);
    }
    return new PanelStateEntry(this.store, yMap as Y.Map<any>);
  }

  /** 全部 panelId（响应式读 panelStates 键集）。 */
  panelIds(): string[] {
    this.subscribePanelStates();
    return [...this.store.panelStates.keys()];
  }

  /** 全量懒 GC：剪除不在 store.tasks 的折叠节点键；不触碰 nav。 */
  sweep(): void {
    for (const panelYMap of this.store.panelStates.values()) {
      if (!(panelYMap instanceof Y.Map)) continue;
      const homes = panelYMap.get("homes");
      if (!(homes instanceof Y.Map)) continue;

      for (const [homeId, homeNode] of [...homes.entries()]) {
        if (!this.store.tasks.has(homeId)) {
          homes.delete(homeId);
          continue;
        }
        if (homeNode instanceof Y.Map) this.#sweepNode(homeNode);
      }
    }
  }

  #sweepNode(node: Y.Map<any>): void {
    for (const [key, value] of [...node.entries()]) {
      if (!(value instanceof Y.Map)) continue;
      if (!this.store.tasks.has(key)) {
        node.delete(key);
      } else {
        this.#sweepNode(value);
      }
    }
  }
}

/**
 * 每面板入口：导航路径 + 每 home 的折叠树。
 *
 * 组件/视图层只通过 `navPaths`（编辑器）与 `tree(homeId)`（折叠）访问；
 * `homesMap` / `ensureHomesMap` / `subscribeEntry` 是实现细节。
 */
export class PanelStateEntry {
  #subscribeEntry: () => void;

  constructor(
    private readonly store: Store,
    readonly yMap: Y.Map<any>,
  ) {
    this.#subscribeEntry = createYMapSubscriber(this.yMap);
  }

  /** 导航栈（仅编辑器）；整体替换读写，get 返回副本。 */
  get navPaths(): string[] | undefined {
    this.#subscribeEntry();
    const nav = this.yMap.get("nav");
    return Array.isArray(nav) ? [...nav] : undefined;
  }

  set navPaths(ids: string[] | undefined) {
    if (ids === undefined) {
      this.yMap.delete("nav");
    } else {
      this.yMap.set("nav", [...ids]);
    }
  }

  /** 每 home 一棵；每次调用重新解析根节点，不缓存包装态。 */
  tree(homeId: string): FoldTree {
    return new FoldTree(this.store, this, homeId);
  }

  /** 从本面板所有 home 树中递归删除以 taskId 为键的节点。 */
  pruneTask(taskId: string): void {
    const homes = this.homesMap;
    if (!homes) return;

    for (const [homeId, homeNode] of [...homes.entries()]) {
      if (homeId === taskId) {
        homes.delete(homeId);
        continue;
      }
      if (homeNode instanceof Y.Map) this.#pruneNode(homeNode, taskId);
    }
  }

  #pruneNode(node: Y.Map<any>, taskId: string): void {
    for (const [key, value] of [...node.entries()]) {
      if (!(value instanceof Y.Map)) continue;
      if (key === taskId) {
        node.delete(key);
      } else {
        this.#pruneNode(value, taskId);
      }
    }
  }

  /** @internal */
  get homesMap(): Y.Map<any> | undefined {
    const homes = this.yMap.get("homes");
    return homes instanceof Y.Map ? homes : undefined;
  }

  /** @internal */
  ensureHomesMap(): Y.Map<any> {
    let homes = this.homesMap;
    if (!homes) {
      homes = new Y.Map();
      this.yMap.set("homes", homes);
    }
    return homes;
  }

  /** @internal */
  subscribeEntry(): void {
    this.#subscribeEntry();
  }
}

export { FoldTree } from "./fold-tree";
