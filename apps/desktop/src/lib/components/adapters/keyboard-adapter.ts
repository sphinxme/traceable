import type { Task } from "$lib/document/entities/task.svelte";
import type { OutlineOps } from "$lib/outline-ops/ops";
import type {
  EdgeRef,
  OccurrenceRef,
  OpFailReason,
  PerformSpec,
} from "$lib/protocol";
import { toast } from "$lib/toast";
import { devWarn } from "$lib/utils";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import type Quill from "quill";
import type { Range } from "quill";
import type { Context } from "quill/modules/keyboard";

/**
 * KeyboardAdapter：键位 → 意图（守卫 → 意图计算 → spec 组装 → perform）。
 *
 * 无自身可变状态；Quill 键位注册留在组件，handler 返回 `!适配器布尔`
 * （Quill 以 false/undefined = 已处理 → preventDefault + 终止绑定链）。
 *
 * 职责边界：意图选择 + spec 组装 + 失败 UX；领域规则（环/唯一性/折叠/级联）
 * 唯一在 OutlineOps，本类只把 ops 调用包进 `spec.op()` 闭包。
 */
export class KeyboardAdapter {
  constructor(private readonly ops: OutlineOps) {}

  /**
   * Tab — 增加缩进：成为前序兄弟的末子。
   *
   * 守卫：root（无 parent）或当前列表首项（无前序兄弟）→ false，交由 Quill 默认。
   * to = [...prev.path(), T.id]；动画 item-move；焦点落回 to 的 cursor 位。
   */
  onTab(handle: ViewHandle, cursor: number): boolean {
    if (!handle.parent) return false;
    const previous = handle.prevSibling();
    if (!previous) return false;

    const edge: EdgeRef = {
      parentTaskId: handle.parent.task.id,
      childTaskId: handle.task.id,
    };
    const from = handle.ref();
    const to: OccurrenceRef = {
      panelId: from.panelId,
      homeId: from.homeId,
      path: [...previous.path(), handle.task.id],
    };
    this.#perform(handle, {
      op: () => this.ops.indent(edge, { from, to }),
      animate: { kind: "item-move", source: handle, target: to },
      focus: { ref: to, cursor },
    });
    return true;
  }

  /**
   * Shift+Tab — 减少缩进：成为父的后一兄弟。
   *
   * 守卫：root 或父为 root → false（无祖父可挂）。
   * to = [...grandparent.path(), T.id]；动画 item-move；焦点落回 to 的 cursor 位。
   */
  onUntab(handle: ViewHandle, cursor: number): boolean {
    if (!handle.parent || !handle.parent.parent) return false;

    const grandparent = handle.parent.parent;
    const edge: EdgeRef = {
      parentTaskId: handle.parent.task.id,
      childTaskId: handle.task.id,
    };
    const from = handle.ref();
    const to: OccurrenceRef = {
      panelId: from.panelId,
      homeId: from.homeId,
      path: [...grandparent.path(), handle.task.id],
    };
    this.#perform(handle, {
      op: () => this.ops.outdent(edge, { from, to }),
      animate: { kind: "item-move", source: handle, target: to },
      focus: { ref: to, cursor },
    });
    return true;
  }

  /**
   * Enter — 4-case 判定（按短路序）：
   * 1. 空文本 && 非顶层 && 列表末位 → untab（空行上浮退出）；
   * 2. 光标在末尾或 root → root/未折叠且有子：在子列表首位插入；
   *    否则在父列表 T 的后位插入（root 标题不可截断）；
   * 3. 光标在首部 → 父列表 T 的前位插入；
   * 4. 光标在中间 → split（单事务），焦点回到原出现 cursor 0。
   *
   * 插入类走非动画路径；id 由 `ops.newTaskId()` 预生成，供 focus/animate 组装。
   */
  onEnter(
    handle: ViewHandle,
    range: Range,
    context: Context,
    quill: Quill,
  ): boolean {
    const cursor = range.index;

    // case 1：空文本 && 非顶层 && 列表末位 → untab（空行上浮退出）
    if (
      quill.getText().trim() === "" &&
      handle.parent?.parent &&
      this.#isLast(handle)
    ) {
      return this.onUntab(handle, cursor);
    }

    // case 2：光标在末尾或 root（root 标题不可截断）
    if (context.suffix.length === 0 || !handle.parent) {
      const unfolded = !handle.parent ? true : !handle.folded;
      if (!handle.parent || (unfolded && handle.task.children.length > 0)) {
        return this.#insert(handle, handle.task, 0, handle.path());
      }
      const index = handle.parent.task.children.findIndex(handle.task.id);
      return this.#insert(
        handle,
        handle.parent.task,
        index + 1,
        handle.parent.path(),
      );
    }

    // case 3：光标在首部 → 父列表前位插
    if (context.prefix.length === 0) {
      const index = handle.parent.task.children.findIndex(handle.task.id);
      return this.#insert(
        handle,
        handle.parent.task,
        index,
        handle.parent.path(),
      );
    }

    // case 4：光标中间 → 截断（焦点 = 原出现）
    const id = this.ops.newTaskId();
    const edge: EdgeRef = {
      parentTaskId: handle.parent.task.id,
      childTaskId: handle.task.id,
    };
    const to: OccurrenceRef = {
      panelId: handle.panel.id,
      homeId: handle.homeId,
      path: [...handle.parent.path(), id],
    };
    this.#perform(handle, {
      op: () => this.ops.split(edge, cursor, id, { to }),
      focus: { ref: handle.ref(), cursor: 0 },
    });
    return true;
  }

  /** Shift+Enter — 笔记开关：出现级状态直写（`handle.noteOpen`），无 op。 */
  onShiftEnter(handle: ViewHandle): boolean {
    if (handle.parent) handle.noteOpen = !handle.noteOpen;
    return true;
  }

  /**
   * ArrowUp — 向上导航（渲染树感知，不是数据树的裸前后）。
   *
   * 有前序兄弟 → 其 `focusBottom`；无 → 父编辑器（cursor +2 视觉缩进补偿）；
   * root 无上浮目标 → false。
   */
  onArrowUp(handle: ViewHandle, cursor: number): boolean {
    if (!handle.parent) return false;
    const previous = handle.prevSibling();
    return previous
      ? previous.focusBottom(cursor)
      : handle.parent.focusEditor(cursor + 2);
  }

  /**
   * ArrowDown — 向下导航（渲染树感知）。
   *
   * 未折叠且有子 → 首个已挂载子（cursor -2 视觉补偿）；
   * 否则 → `focusNext`（下一可见兄弟或父层递归上浮）。
   */
  onArrowDown(handle: ViewHandle, cursor: number): boolean {
    const unfolded = !handle.parent ? true : !handle.folded;
    if (unfolded && handle.task.children.length > 0) {
      const first = handle.firstChild();
      return first ? first.focusEditor(cursor - 2) : false;
    }
    return handle.focusNext(cursor);
  }

  // —— 私有 ——

  #isLast(handle: ViewHandle): boolean {
    const children = handle.parent!.task.children;
    return children.findIndex(handle.task.id) === children.length - 1;
  }

  /** 插入类共用：id 预生成 → to 组装 → perform（无动画；焦点 = 新出现 cursor 0）。 */
  #insert(
    handle: ViewHandle,
    parentTask: Task,
    index: number,
    parentPath: string[],
  ): boolean {
    const id = this.ops.newTaskId();
    const to: OccurrenceRef = {
      panelId: handle.panel.id,
      homeId: handle.homeId,
      path: [...parentPath, id],
    };
    this.#perform(handle, {
      op: () => this.ops.insert(parentTask, index, undefined, id, { to }),
      focus: { ref: to, cursor: 0 },
    });
    return true;
  }

  #perform(handle: ViewHandle, spec: PerformSpec): void {
    handle.panel.perform(spec).then((result) => {
      if (result.ok === false) this.#notifyFail(result.reason);
    });
  }

  #notifyFail(reason: OpFailReason): void {
    if (reason === "cycle" || reason === "duplicate") toast(reason);
    else devWarn("keyboard op failed", reason);
  }
}
