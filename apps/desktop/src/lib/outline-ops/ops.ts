import type { Store } from "$lib/document/entities/store.svelte";
import type { Task } from "$lib/document/entities/task.svelte";
import type {
  FoldTree,
  PanelState,
} from "$lib/document/panel-state/panel-state";
import { id } from "$lib/document/entities/utils";
import {
  isValidRef,
  toParentOf,
  type ChangeDescriptor,
  type CheckResult,
  type EdgeRef,
  type OccurrenceRef,
  type OpFailReason,
  type OpResult,
} from "$lib/protocol";
import { devWarnOnce } from "$lib/utils";
import { checkAttach, checkDropImpl } from "./check";

/**
 * 结构操作类：全应用唯一允许修改大纲拓扑的地方（G2）。
 *
 * 统一骨架：① 结构校验（invalid）→ ② 执行时重校验（notFound / cycle / duplicate）
 * → ③ 同一 Yjs 事务内「先数据原语、后折叠原语」→ ④ 事务后回读 post-state 描述符。
 *
 * 失败语义：可预期失败一律以返回值报告（不抛出）；失败路径不改数据、不迁移折叠、
 * 不产生目标命名、不发焦点。事务体内只调用已验证必然成功的原语（无抛出保证）。
 *
 * 边语义：indent / outdent / move / unlink / remove 改的是 `EdgeRef` 这一条边；
 * 多父下该实体的其他出现不受影响。折叠动作只落在 `view` 指定的出现上。
 *
 * 调用方只有两类：`Panel.perform`（经 `spec.op()` 闭包，唯一拓扑写通道）与
 * 适配层（只调 `checkDrop` 谓词与 `newTaskId`）。
 */
export class OutlineOps {
  constructor(
    private readonly store: Store,
    private readonly panelState: PanelState,
  ) {}

  /**
   * 预生成新任务 id：纯分配，不占用、不校验。
   * 供适配层在 op 执行前组装 `focus.ref` / `animate.target`；占用防御在 insert/split 执行期。
   */
  newTaskId(): string {
    return id();
  }

  /**
   * 拖放预检（薄委托 check.ts，与执行期权威校验同源）。
   * 纯谓词、无副作用；供 dragover 计算 dropEffect，不产生任何写入。
   */
  checkDrop(
    edge: EdgeRef,
    task: Task,
    toParent: Task,
    kind: "move" | "link",
  ): CheckResult {
    return checkDropImpl(this.store, edge, task, toParent, kind);
  }

  /**
   * 新建实体并挂到 parent 子列表的 index 处。
   *
   * - index = 目标列表当前态插入槽位，越界收敛到 `[0, len]`；
   * - 事务内：createTask → attachChild → 展开落点父（幂等，已展开时零写入）；
   * - 失败：ref 结构非法 / taskId 已占用 → invalid；parent 不存在 → notFound；
   * - 描述符：inserted，toIndex 为事务后实际位次。
   */
  insert(
    parent: Task,
    index: number,
    text: string | undefined,
    taskId: string,
    view: { to: OccurrenceRef },
  ): OpResult {
    if (!this.#validRef(view.to)) return this.#fail("invalid");
    if (!this.#exists(parent)) return this.#fail("notFound");
    if (this.store.tasks.has(taskId)) return this.#fail("invalid");

    this.store.doc.transact(() => {
      const targetIndex = this.#clampIndex(index, parent.children.length);
      const task = this.store.createTask(text ?? "", taskId);
      parent.attachChild(task, targetIndex);
      this.#unfoldParentOf(view.to);
    });

    return this.#ok({
      op: "inserted",
      taskId,
      parentTaskId: parent.id,
      toIndex: parent.children.findIndex(taskId),
    });
  }

  /**
   * 在光标处截断标题：prefix 归新任务、新任务插在 T 之前、T 删除 prefix（单事务）。
   *
   * - cursorIndex 为 UTF-16 code unit 偏移，须落在 `[0, text.length]`；
   * - 事务内：createTask(prefix) → attachChild(childIndex) → child.text.delete → 展开落点父；
   * - 失败：ref/游标非法或 newTaskId 已占用 → invalid；边失效 → notFound；
   * - 描述符：split（fromTaskId / newTaskId / parentTaskId / toIndex）。
   */
  split(
    edge: EdgeRef,
    cursorIndex: number,
    newTaskId: string,
    view: { to: OccurrenceRef },
  ): OpResult {
    if (!this.#validRef(view.to)) return this.#fail("invalid");
    if (!Number.isInteger(cursorIndex)) return this.#fail("invalid");
    if (this.store.tasks.has(newTaskId)) return this.#fail("invalid");

    const resolved = this.#resolveEdge(edge);
    if (!resolved) return this.#fail("notFound");

    const { parent, child } = resolved;
    if (cursorIndex < 0 || cursorIndex > child.text.length) {
      return this.#fail("invalid");
    }

    this.store.doc.transact(() => {
      const prefix = child.text.toString().slice(0, cursorIndex);
      const childIndex = parent.children.findIndex(child.id);
      const newTask = this.store.createTask(prefix, newTaskId);
      parent.attachChild(newTask, childIndex);
      child.text.delete(0, cursorIndex);
      this.#unfoldParentOf(view.to);
    });

    return this.#ok({
      op: "split",
      fromTaskId: child.id,
      newTaskId,
      parentTaskId: parent.id,
      toIndex: parent.children.findIndex(newTaskId),
    });
  }

  /**
   * Tab 缩进：T 成为前序兄弟 prev 的末子（`to.parent = prev`）。
   *
   * - 事务内：detach 旧边 → attach 到新父末位 → 折叠子树 from→to → 展开落点父；
   * - 失败：边/新父失效 → notFound；将成环 → cycle；新父已含 T → duplicate；
   * - 描述符：moved（kind=reparent，toIndex = 新父 children 中的实际位次）。
   */
  indent(
    edge: EdgeRef,
    view: { from: OccurrenceRef; to: OccurrenceRef },
  ): OpResult {
    if (!this.#validRef(view.from) || !this.#validRef(view.to)) {
      return this.#fail("invalid");
    }

    const resolved = this.#resolveEdge(edge);
    if (!resolved) return this.#fail("notFound");

    const newParent = this.store.getTask(toParentOf(view.to));
    if (!newParent) return this.#fail("notFound");

    const check = checkAttach(this.store, resolved.child, newParent);
    if (check.ok === false) return this.#fail(check.reason);

    this.store.doc.transact(() => {
      resolved.parent.detachChild(resolved.child);
      newParent.attachChild(resolved.child);
      this.#migrateFold(view);
      this.#unfoldParentOf(view.to);
    });

    return this.#movedResult(resolved.parent, newParent, resolved.child);
  }

  /**
   * Shift+Tab 减少缩进：T 成为祖父 G 下、父 P 的后一兄弟。
   *
   * - P 已不在 G.children 时 `indexOf(P)+1 = 0`，位次收敛到新父首位；
   * - 事务内：detach P→T → attach G→T → 折叠迁移 → 展开落点父；
   * - 失败/描述符同 indent。
   */
  outdent(
    edge: EdgeRef,
    view: { from: OccurrenceRef; to: OccurrenceRef },
  ): OpResult {
    if (!this.#validRef(view.from) || !this.#validRef(view.to)) {
      return this.#fail("invalid");
    }

    const resolved = this.#resolveEdge(edge);
    if (!resolved) return this.#fail("notFound");

    const newParent = this.store.getTask(toParentOf(view.to));
    if (!newParent) return this.#fail("notFound");

    const check = checkAttach(this.store, resolved.child, newParent);
    if (check.ok === false) return this.#fail(check.reason);

    this.store.doc.transact(() => {
      const targetIndex = newParent.children.findIndex(resolved.parent.id) + 1;
      resolved.parent.detachChild(resolved.child);
      newParent.attachChild(resolved.child, targetIndex);
      this.#migrateFold(view);
      this.#unfoldParentOf(view.to);
    });

    return this.#movedResult(resolved.parent, newParent, resolved.child);
  }

  /**
   * 拖放移动：同父 = reorder，异父 = reparent。
   *
   * - `kind` 仅作意图声明，实际按 edge 两端的数据关系分派；不一致时 devWarnOnce；
   * - reorder：先删后插换算在事务内完成，不迁移折叠；描述符报告实际位次；
   * - reparent：直插即终位，迁移折叠子树并展开落点父；
   * - toIndex = 目标列表当前态插入槽位，越界收敛；描述符 toIndex 为 post-state；
   * - 失败：边/目标父失效 → notFound；异父时环 → cycle、重复边 → duplicate。
   */
  move(
    edge: EdgeRef,
    toParent: Task,
    toIndex: number,
    kind: "reorder" | "reparent",
    view: { from: OccurrenceRef; to: OccurrenceRef },
  ): OpResult {
    if (!this.#validRef(view.from) || !this.#validRef(view.to)) {
      return this.#fail("invalid");
    }

    const resolved = this.#resolveEdge(edge);
    if (!resolved) return this.#fail("notFound");
    if (!this.#exists(toParent)) return this.#fail("notFound");

    const sameParent = resolved.parent.id === toParent.id;
    if (!sameParent) {
      const check = checkAttach(this.store, resolved.child, toParent);
      if (check.ok === false) return this.#fail(check.reason);
    }

    if ((kind === "reorder") !== sameParent) {
      devWarnOnce("ops.move.kind-mismatch", "ops.move kind 与数据关系不一致", {
        kind,
        sameParent,
      });
    }

    this.store.doc.transact(() => {
      if (sameParent) {
        const current = toParent.children.findIndex(resolved.child.id);
        const slot = this.#clampIndex(toIndex, toParent.children.length);
        toParent.children.move(
          resolved.child.id,
          current < slot ? slot - 1 : slot,
        );
      } else {
        resolved.parent.detachChild(resolved.child);
        toParent.attachChild(
          resolved.child,
          this.#clampIndex(toIndex, toParent.children.length),
        );
        this.#migrateFold(view);
        this.#unfoldParentOf(view.to);
      }
    });

    if (sameParent) {
      return this.#ok({
        op: "moved",
        taskId: resolved.child.id,
        fromParentTaskId: resolved.parent.id,
        toParentTaskId: toParent.id,
        toIndex: toParent.children.findIndex(resolved.child.id),
        kind: "reorder",
      });
    }

    return this.#movedResult(resolved.parent, toParent, resolved.child);
  }

  /**
   * 新增一条 `toParent → task` 的边（多父引用），源出现保留。
   *
   * - 无折叠迁移；仅展开落点父；
   * - 事务内：attachChild（多父的另一侧 parents 由 Task 原语同步维护）；
   * - 失败：实体失效 → notFound；环 → cycle；已存在边 → duplicate；
   * - 描述符：linked（taskId / parentTaskId）。
   */
  link(
    task: Task,
    toParent: Task,
    toIndex: number,
    view: { to: OccurrenceRef },
  ): OpResult {
    if (!this.#validRef(view.to)) return this.#fail("invalid");
    if (!this.#exists(task) || !this.#exists(toParent)) {
      return this.#fail("notFound");
    }

    const check = checkAttach(this.store, task, toParent);
    if (check.ok === false) return this.#fail(check.reason);

    this.store.doc.transact(() => {
      toParent.attachChild(
        task,
        this.#clampIndex(toIndex, toParent.children.length),
      );
      this.#unfoldParentOf(view.to);
    });

    return this.#ok({
      op: "linked",
      taskId: task.id,
      parentTaskId: toParent.id,
    });
  }

  /**
   * 删除 edge 这一条边；若 T 已无其他父边，则转入 remove 的级联路径。
   *
   * - 事务内：detach →（级联：删“无边可达”的实体 + 全 panel pruneTask）
   *   → 删除 from 折叠子树；
   * - 描述符：未级联 = unlinked；级联 = removed(cascaded=true)；
   * - 失败：ref 非法 → invalid；边失效 → notFound。
   */
  unlink(edge: EdgeRef, view: { from: OccurrenceRef }): OpResult {
    if (!this.#validRef(view.from)) return this.#fail("invalid");

    const resolved = this.#resolveEdge(edge);
    if (!resolved) return this.#fail("notFound");

    let cascaded = false;

    this.store.doc.transact(() => {
      resolved.parent.detachChild(resolved.child);

      if (resolved.child.parents.length === 0) {
        cascaded = true;
        const deleted: string[] = [];
        this.#deleteEntityCascade(resolved.child, deleted);
        this.#treeOf(view.from).deleteSubtree(view.from.path);
        this.#pruneAllPanels(deleted);
      } else {
        this.#treeOf(view.from).deleteSubtree(view.from.path);
      }
    });

    if (cascaded) {
      return this.#ok({
        op: "removed",
        taskId: resolved.child.id,
        fromParentTaskId: resolved.parent.id,
        cascaded: true,
      });
    }

    return this.#ok({
      op: "unlinked",
      taskId: resolved.child.id,
      parentTaskId: resolved.parent.id,
    });
  }

  /**
   * 删除 edge 这一条边；若 T 已无其他父边，则级联删除“无边可达”的后代实体。
   *
   * - 级联规则：先剪子边；子任务仍有其他父边则存活，否则递归删除（无边即亡）；
   * - 事务内：detach → [级联] → 删除 from 折叠子树 → 级联时全 panel pruneTask；
   * - 描述符：removed（cascaded 表示是否发生实体删除）；
   * - 失败：ref 非法 → invalid；边失效 → notFound。
   */
  remove(edge: EdgeRef, view: { from: OccurrenceRef }): OpResult {
    if (!this.#validRef(view.from)) return this.#fail("invalid");

    const resolved = this.#resolveEdge(edge);
    if (!resolved) return this.#fail("notFound");

    let cascaded = false;

    this.store.doc.transact(() => {
      resolved.parent.detachChild(resolved.child);

      const deleted: string[] = [];
      if (resolved.child.parents.length === 0) {
        cascaded = true;
        this.#deleteEntityCascade(resolved.child, deleted);
      }

      this.#treeOf(view.from).deleteSubtree(view.from.path);
      if (cascaded) this.#pruneAllPanels(deleted);
    });

    return this.#ok({
      op: "removed",
      taskId: resolved.child.id,
      fromParentTaskId: resolved.parent.id,
      cascaded,
    });
  }

  /**
   * 递归删除“无边可达”的实体：先剪子边（仍被其他父引用的子任务存活），
   * 再 deleteEntity（纯实体清理）。调用方必须已在事务内解除 task 的最后一条父边。
   */
  #deleteEntityCascade(task: Task, deleted: string[]): void {
    deleted.push(task.id);

    const childIds = task.children.toIds();
    for (const childId of childIds) {
      const child = this.store.getTask(childId);
      if (!child) continue;

      task.detachChild(child);
      if (child.parents.length === 0) {
        this.#deleteEntityCascade(child, deleted);
      }
    }

    this.store.deleteEntity(task.id);
  }

  /**
   * 级联删除后清理所有面板的折叠键（G10）：按 (panelId, homeId) 递归 pruneTask。
   * 必须在删除实体的同一事务内调用。
   */
  #pruneAllPanels(deletedIds: Iterable<string>): void {
    for (const panelId of this.panelState.panelIds()) {
      const entry = this.panelState.entry(panelId);
      for (const taskId of deletedIds) {
        entry.pruneTask(taskId);
      }
    }
  }

  #ok(change: ChangeDescriptor): OpResult {
    return { ok: true, change };
  }

  #fail(reason: OpFailReason): OpResult {
    return { ok: false, reason };
  }

  #validRef(ref: OccurrenceRef): boolean {
    return isValidRef(ref);
  }

  #exists(task: Task): boolean {
    return this.store.tasks.has(task.id);
  }

  #resolveEdge(edge: EdgeRef): { parent: Task; child: Task } | undefined {
    const parent = this.store.getTask(edge.parentTaskId);
    const child = this.store.getTask(edge.childTaskId);
    if (!parent || !child || !parent.children.includes(child.id)) {
      return undefined;
    }
    return { parent, child };
  }

  #treeOf(ref: OccurrenceRef): FoldTree {
    return this.panelState.entry(ref.panelId).tree(ref.homeId);
  }

  #unfoldParentOf(to: OccurrenceRef): void {
    this.#treeOf(to).unfold(to.path.slice(0, -1));
  }

  #clampIndex(index: number, length: number): number {
    if (!Number.isFinite(index)) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), length);
  }

  #migrateFold(view: { from: OccurrenceRef; to: OccurrenceRef }): void {
    this.#treeOf(view.from).moveSubtree(
      view.from.path,
      this.#treeOf(view.to),
      view.to.path,
    );
  }

  #movedResult(fromParent: Task, toParent: Task, child: Task): OpResult {
    return this.#ok({
      op: "moved",
      taskId: child.id,
      fromParentTaskId: fromParent.id,
      toParentTaskId: toParent.id,
      toIndex: toParent.children.findIndex(child.id),
      kind: "reparent",
    });
  }
}
