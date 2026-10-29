import type { Task } from "$lib/document/entities/task.svelte";
import type { DragService } from "$lib/interaction/drag-service.svelte";
import type { OutlineOps } from "$lib/outline-ops/ops";
import {
  sameOccurrence,
  type DragPayload,
  type DropSlot,
  type OccurrenceRef,
  type OpFailReason,
  type PerformSpec,
} from "$lib/protocol";
import { toast } from "$lib/toast";
import { devWarn } from "$lib/utils";
import type { ViewHandle } from "$lib/view/view-handle.svelte";

/**
 * DnDAdapter：无状态拖放事件解释器；DragService 的唯一写者。
 *
 * 四 handler：dragstart 捕获源侧、dragover 算 dropEffect、drop 定稿 spec、dragend 终结会话。
 * 两次事件之间的记忆全部在 DragService；本类不持有跨事件状态。
 *
 * 规则表（`#pickKind`）：同面板默认 move、metaKey → link；跨面板默认 link、metaKey → move。
 * dragover 的 `checkDrop` 与执行期权威校验同源；被拒路径返回 "none"，不产生 perform。
 */
export class DnDAdapter {
  constructor(
    private readonly ds: DragService,
    private readonly ops: OutlineOps,
  ) {}

  /**
   * ① dragstart：把“拖的是什么”定格进会话。
   *
   * payload = { task, edge, from, sourceHandle }，此后不可变；
   * root 无手柄（结构上不可拖）；`setData` 仅作 HTML5 协议标记，引用数据在 DragService。
   */
  onDragStart(event: DragEvent, sourceHandle: ViewHandle): void {
    if (!sourceHandle.parent) return;

    const task = sourceHandle.task;
    this.ds.begin({
      task,
      edge: {
        parentTaskId: sourceHandle.parent.task.id,
        childTaskId: task.id,
      },
      from: sourceHandle.ref(),
      sourceHandle,
    });

    event.dataTransfer!.setData("application/x-traceable", task.id);
    event.dataTransfer!.effectAllowed = "linkMove";
  }

  /**
   * ② dragover（高频路径）：纯读零写，回答“这里给什么光标”。
   *
   * 无 payload 或 sameSpot → "none"；否则按规则表选 kind，调 `ops.checkDrop` 预检；
   * 合法 → kind，非法 → "none"。dropEffect 即反馈，被拒路径不产生任何写入。
   */
  onDragOver(slot: DropSlot, metaKey: boolean): DataTransfer["dropEffect"] {
    const payload = this.ds.payload;
    if (!payload) return "none";
    if (this.#sameSpot(slot, payload)) return "none";

    const kind = this.#pickKind(slot, payload, metaKey);
    const check = this.ops.checkDrop(
      payload.edge,
      payload.task,
      slot.parentHandle.task,
      kind,
    );
    return check.ok ? kind : "none";
  }

  /**
   * ③ drop：零写（会话终结留给 dragend）；读 payload + 落点 → spec → perform。
   *
   * kind 按当前 metaKey 即时重算，不信任悬停期光标态；toIndex = 当前态插入槽位。
   * move 带 item-move 动画（同父换位且路径不变时不带）；link 不带动画、不带焦点。
   * 目标面板是流程所有者——perform 在落点面板发起，源面板零协调参与。
   */
  onDrop(slot: DropSlot, metaKey: boolean): void {
    const payload = this.ds.payload;
    if (!payload || this.#sameSpot(slot, payload)) return;

    const kind = this.#pickKind(slot, payload, metaKey);
    const toParent = slot.parentHandle.task;
    const to: OccurrenceRef = {
      panelId: slot.parentHandle.panel.id,
      homeId: slot.parentHandle.homeId,
      path: [...slot.parentHandle.path(), payload.task.id],
    };

    const spec: PerformSpec =
      kind === "link"
        ? {
            op: () => this.ops.link(payload.task, toParent, slot.index, { to }),
          }
        : {
            op: () =>
              this.ops.move(
                payload.edge,
                toParent,
                slot.index,
                this.#opsKind(payload, toParent),
                { from: payload.from, to },
              ),
            animate: this.#moveAnimate(payload, to, toParent),
          };

    slot.parentHandle.panel.perform(spec).then((result) => {
      if (result.ok === false) this.#notifyFail(result.reason);
    });
  }

  /**
   * ④ dragend：会话终结（正常/被拒/取消三路唯一出口）。
   * 先于 op 执行，与 in-flight perform 完全解耦；幂等。
   */
  onDragEnd(): void {
    this.ds.end();
  }

  // —— 私有：纯函数规则表 ——

  #pickKind(
    slot: DropSlot,
    payload: DragPayload,
    metaKey: boolean,
  ): "move" | "link" {
    const samePanel = slot.parentHandle.panel.id === payload.from.panelId;
    if (metaKey) return samePanel ? "link" : "move";
    return samePanel ? "move" : "link";
  }

  #sameSpot(slot: DropSlot, payload: DragPayload): boolean {
    if (slot.parentHandle.panel.id !== payload.from.panelId) return false;
    if (slot.parentHandle.task.id !== payload.edge.parentTaskId) return false;
    const current = slot.parentHandle.task.children.findIndex(payload.task.id);
    return slot.index === current || slot.index === current + 1;
  }

  #opsKind(payload: DragPayload, toParent: Task): "reorder" | "reparent" {
    return payload.edge.parentTaskId === toParent.id ? "reorder" : "reparent";
  }

  #moveAnimate(
    payload: DragPayload,
    to: OccurrenceRef,
    toParent: Task,
  ): PerformSpec["animate"] | undefined {
    if (payload.edge.parentTaskId !== toParent.id) {
      return { kind: "item-move", source: payload.sourceHandle, target: to };
    }
    return sameOccurrence(payload.from, to)
      ? { kind: "item-move", source: payload.sourceHandle, target: to }
      : undefined;
  }

  #notifyFail(reason: OpFailReason): void {
    if (reason === "cycle" || reason === "duplicate") toast(reason);
    else devWarn("drop op failed", reason);
  }
}
