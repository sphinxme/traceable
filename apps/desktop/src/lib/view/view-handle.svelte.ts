import type { Task } from "$lib/document/entities/task.svelte";
import type { OccurrenceRef, ViewPart } from "$lib/protocol";
import { devWarn } from "$lib/utils";
import type { Panel } from "./panel.svelte";

/**
 * ViewHandle：运行时身份 + DOM 接线板 + 出现级状态容器，与一个已挂载出现一一对应。
 *
 * - 构造 = 纯对象分配：无登记、无订阅、无 DOM 访问（组件 script 顶层 new 无害）。
 * - hid 不透明、仅调试/日志，不参与寻址（G5）；跨变更找回一律 OccurrenceRef。
 * - reparent / zoom / 导航 / home 变更销毁旧条目实例；reorder 不销毁（keyed each 只移动组件）。
 */
export class ViewHandle {
  static #nextHid = 0;

  readonly hid: number;
  readonly panel: Panel;
  readonly task: Task;
  readonly parent: ViewHandle | undefined;
  readonly depth: number;

  /**
   * 已挂载子条目实例表（taskId → handle）；ViewRegistry 是唯一写者（G4）。
   *
   * 【顺序警告】Map 为挂载序，≠ 数据序（reorder 不重建条目实例）——顺序敏感读取必须走
   * task.children（数据序）+ 本表按 id 查。
   */
  readonly children = new Map<string, ViewHandle>();

  // —— DOM 接线（组件 effect 赋值/清理）——

  /** 返回 false = 未接线或编辑器未就绪。 */
  focusEditor: (cursor: number) => boolean = () => false;
  scrollIntoView: () => void = () => {};
  #parts: Partial<Record<ViewPart, HTMLElement>> = {};

  // —— 出现级状态（条目实例局部）——

  /** reveal 高亮截止时刻；呈现与定时清理由组件负责。 */
  highlightUntil = $state<number | null>(null);
  /** 笔记 Popover 开关（Shift+Enter 适配层直写翻转，无 op）。 */
  noteOpen = $state(false);

  constructor(panel: Panel, task: Task, parent?: ViewHandle) {
    this.hid = ViewHandle.#nextHid++;
    this.panel = panel;
    this.task = task;
    this.parent = parent;
    this.depth = parent ? parent.depth + 1 : 0;
  }

  // —— 地址 ——

  /** 从 home（不含）到本条目实例（含）的 taskId 序列；root = []。 */
  path(): string[] {
    const ids: string[] = [];
    let handle: ViewHandle | undefined = this;
    while (handle.parent) {
      ids.push(handle.task.id);
      handle = handle.parent;
    }
    return ids.reverse();
  }

  /** 挂载方言地址；每次调用新对象，不缓存。 */
  ref(): OccurrenceRef {
    return { panelId: this.panel.id, homeId: this.homeId, path: this.path() };
  }

  get homeId(): string {
    return this.homeHandle.task.id;
  }

  get homeHandle(): ViewHandle {
    let handle: ViewHandle = this;
    while (handle.parent) handle = handle.parent;
    return handle;
  }

  isAncestorOf(handle: ViewHandle): boolean {
    let current = handle.parent;
    while (current) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }

  // —— DOM 接线 ——

  /** 绑定 part 元素；重复绑定后者胜 + devWarn（正常接线每 part 恰一次）。 */
  bindPart(part: ViewPart, el: HTMLElement): void {
    if (this.#parts[part]) {
      devWarn(`ViewHandle#${this.hid}: duplicate bindPart("${part}")`);
    }
    this.#parts[part] = el;
  }

  /** 解绑（effect cleanup 卫生，非正确性依赖）。 */
  unbindPart(part: ViewPart): void {
    delete this.#parts[part];
  }

  /**
   * 写动画命名（同步 DOM 写，G8：startViewTransition 捕获新快照前必然生效）。
   * `name === "none"` 清除；part 未绑定 = no-op（死接线无害）。
   */
  setTransitionName(part: ViewPart, name: string | "none"): void {
    const el = this.#parts[part];
    if (!el) return;
    el.style.viewTransitionName = name === "none" ? "" : name;
  }

  /**
   * 比较清除：仅当元素当前名 === name 时清空。
   * 已被后续 TransitionRun 改名 → no-op（skip 链只清自己写下的名字）。
   */
  clearTransitionName(part: ViewPart, name: string): void {
    const el = this.#parts[part];
    if (!el || el.style.viewTransitionName !== name) return;
    el.style.viewTransitionName = "";
  }

  // —— 折叠通道（G3：FoldTree 是唯一权威）——

  get folded(): boolean {
    return this.panel.foldTrees.tree(this.homeId).isFolded(this.path());
  }

  set folded(value: boolean) {
    this.panel.foldTrees.tree(this.homeId).setFolded(this.path(), value);
  }

  // —— 键盘走法（渲染树感知）——

  /** 数据序向前最近【已挂载】兄弟。 */
  prevSibling(): ViewHandle | undefined {
    const parent = this.parent;
    if (!parent) return undefined;
    const ids = parent.task.children.toIds();
    for (let i = ids.indexOf(this.task.id) - 1; i >= 0; i--) {
      const handle = parent.children.get(ids[i]);
      if (handle) return handle;
    }
    return undefined;
  }

  /** 数据序向后最近【已挂载】兄弟。 */
  nextSibling(): ViewHandle | undefined {
    const parent = this.parent;
    if (!parent) return undefined;
    const ids = parent.task.children.toIds();
    for (let i = ids.indexOf(this.task.id) + 1; i < ids.length; i++) {
      const handle = parent.children.get(ids[i]);
      if (handle) return handle;
    }
    return undefined;
  }

  /** 数据序首个【已挂载】子；折叠的子树未挂载 → undefined。 */
  firstChild(): ViewHandle | undefined {
    for (const id of this.task.children.toIds()) {
      const handle = this.children.get(id);
      if (handle) return handle;
    }
    return undefined;
  }

  /** 数据序末个【已挂载】子。 */
  lastChild(): ViewHandle | undefined {
    const ids = this.task.children.toIds();
    for (let i = ids.length - 1; i >= 0; i--) {
      const handle = this.children.get(ids[i]);
      if (handle) return handle;
    }
    return undefined;
  }

  /** 折叠或无子 → 本条目实例的编辑器；否则末子递归，每层 -2（视觉缩进补偿）。 */
  focusBottom(cursor: number): boolean {
    const last = this.lastChild();
    return last ? last.focusBottom(cursor - 2) : this.focusEditor(cursor);
  }

  /**
   * 下一可见兄弟 → 其编辑器；无 → 父递归上浮，每层 +2；root 无处可去 → false。
   */
  focusNext(cursor: number): boolean {
    const next = this.nextSibling();
    if (next) return next.focusEditor(cursor);
    return this.parent ? this.parent.focusNext(cursor + 2) : false;
  }
}
