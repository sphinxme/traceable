import * as Y from "yjs";
import type { Store } from "$lib/document/entities/store.svelte";
import { createYMapSubscriber } from "$lib/document/entities/reactive-yjs";
import { samePath } from "$lib/protocol";
import type { PanelStateEntry } from "./panel-state";

/**
 * 单个 home 的折叠树访问器（无状态包装：每次操作重新解析节点）。
 *
 * 折叠树的唯一权威（G3）；节点懒创建、默认展开。读路径零写入——仅
 * `isFolded` 途遇死键时剪除该键（懒 GC），其余读操作不建节点。
 *
 * 语义差异（ops 契约 C1）：
 * - `setFolded`：用户折叠通道，懒建整条链；
 * - `unfold`：缺省 no-op，已展开时零写入；
 * - `moveSubtree`：源存在才 clone + 删源，源缺失时目标侧也不建节点。
 */
export class FoldTree {
  constructor(
    private readonly store: Store,
    private readonly entry: PanelStateEntry,
    private readonly homeId: string,
  ) {}

  /**
   * 响应式读取 path 处节点的折叠态；节点不存在 = false（展开）。
   * 逐级订阅 Y.Map；途遇不在 store.tasks 的死键 → 剪除该键并按展开处理（懒 GC）。
   */
  isFolded(path: string[]): boolean {
    const node = this.#nodeAt(path, true);
    if (!node) return false;
    return node.get("folded") === true;
  }

  /**
   * 写折叠态（懒建整条链）；path = [] 时写根节点（无意义但无害）。
   * 这是用户折叠/展开的唯一写入口（G3 通道），不应在渲染期调用。
   */
  setFolded(path: string[], folded: boolean): void {
    this.#ensureNode(path).set("folded", folded);
  }

  /**
   * 单点展开；节点不存在 → no-op（不建节点，ops 契约 C1）。
   * 与 setFolded 的懒建链语义刻意不同：落点父本就展开时保持零写入。
   */
  unfold(path: string[]): void {
    const node = this.#nodeAt(path, false);
    if (!node) return;
    if (node.get("folded") === true) {
      node.set("folded", false);
    }
  }

  /**
   * 链式展开：对 path 的每个真前缀（path[0..i], i ≤ len-2）逐一 unfold。
   * reveal 用：让目标出现可见；最后一个元素（目标自身）不展开。
   */
  expandAlong(path: string[]): void {
    for (let i = 0; i < path.length - 1; i++) {
      this.unfold(path.slice(0, i + 1));
    }
  }

  /**
   * 折叠子树迁移（move/indent/outdent/reparent）：源存在 → clone 挂到目标 + 删源；
   * 源缺失 → 完全 no-op（目标侧不建任何节点，目标出现懒初始化为展开）。
   *
   * 使用 clone + 删除源而非跨容器直接赋值：Yjs 不保证已集成类型跨容器赋值的语义；
   * 折叠树稀疏，事务内 clone 成本可忽略。跨 panel 时两棵 entry 必须在同一事务内写（G2）。
   */
  moveSubtree(fromPath: string[], toTree: FoldTree, toPath: string[]): void {
    const source = this.#nodeAt(fromPath, false);
    if (!source) return;

    const sameTree =
      this.entry.homesMap === toTree.entry.homesMap &&
      this.homeId === toTree.homeId;
    if (sameTree && samePath(fromPath, toPath)) return;

    const clone = this.#cloneNode(source);
    toTree.#attachClone(toPath, clone);
    this.deleteSubtree(fromPath);
  }

  /**
   * 删除 path 处节点（连同其嵌套子树）；节点不存在 → no-op。
   * 出现消亡时其子出现的折叠节点随之消亡（级联路径另有 pruneTask 兜底）。
   */
  deleteSubtree(path: string[]): void {
    const homes = this.entry.homesMap;
    if (!homes) return;

    if (path.length === 0) {
      if (homes.has(this.homeId)) homes.delete(this.homeId);
      return;
    }

    const parent = this.#nodeAt(path.slice(0, -1), false);
    if (!parent) return;
    parent.delete(path.at(-1)!);
  }

  #nodeAt(path: string[], gc: boolean): Y.Map<any> | undefined {
    this.entry.subscribeEntry();
    const homes = this.entry.homesMap;
    if (!homes) return undefined;

    createYMapSubscriber(homes)();

    let node = homes.get(this.homeId);
    if (!(node instanceof Y.Map)) return undefined;

    if (gc && !this.store.tasks.has(this.homeId)) {
      homes.delete(this.homeId);
      return undefined;
    }
    createYMapSubscriber(node)();

    for (const id of path) {
      if (gc && !this.store.tasks.has(id)) {
        node.delete(id);
        return undefined;
      }

      const child = node.get(id);
      if (!(child instanceof Y.Map)) return undefined;
      node = child;
      createYMapSubscriber(node)();
    }

    return node;
  }

  #ensureNode(path: string[]): Y.Map<any> {
    const homes = this.entry.ensureHomesMap();

    let node = homes.get(this.homeId);
    if (!(node instanceof Y.Map)) {
      node = new Y.Map();
      homes.set(this.homeId, node);
    }

    for (const id of path) {
      let child = node.get(id);
      if (!(child instanceof Y.Map)) {
        child = new Y.Map();
        node.set(id, child);
      }
      node = child;
    }

    return node;
  }

  #attachClone(path: string[], clone: Y.Map<any>): void {
    if (path.length === 0) {
      this.entry.ensureHomesMap().set(this.homeId, clone);
      return;
    }

    const parent = this.#ensureNode(path.slice(0, -1));
    parent.set(path.at(-1)!, clone);
  }

  #cloneNode(node: Y.Map<any>): Y.Map<any> {
    const clone = new Y.Map();
    for (const [key, value] of node) {
      clone.set(key, value instanceof Y.Map ? this.#cloneNode(value) : value);
    }
    return clone;
  }
}
