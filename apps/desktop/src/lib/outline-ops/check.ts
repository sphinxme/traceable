import type { Store } from "$lib/document/entities/store.svelte";
import type { Task } from "$lib/document/entities/task.svelte";
import { isDescendantOrSelf } from "$lib/document/search";
import type { CheckResult, EdgeRef } from "$lib/protocol";

/**
 * 在 toParent 下为 task 新建/改挂一条边是否合法（不含 reorder 特例）。
 *
 * 纯谓词、无副作用，执行期权威校验与适配层预检共用这一份实现：
 * - notFound：task / toParent 实体不存在；
 * - cycle：toParent ∈ {task} ∪ task 的后代（`isDescendantOrSelf`）；
 * - duplicate：toParent.children 已含 task（G1）。
 */
export function checkAttach(
  store: Store,
  task: Task,
  toParent: Task,
): CheckResult {
  if (!store.tasks.has(task.id) || !store.tasks.has(toParent.id)) {
    return { ok: false, reason: "notFound" };
  }
  if (isDescendantOrSelf(task, toParent.id)) {
    return { ok: false, reason: "cycle" };
  }
  if (toParent.children.includes(task.id)) {
    return { ok: false, reason: "duplicate" };
  }
  return { ok: true };
}

/**
 * 适配层拖放预检（dragover / drop 定稿共用）。
 *
 * - notFound：task / toParent / move 的源边失效；
 * - move 且源父 = 目标父：视为合法（同父内 reorder，不另做环/重复判断）；
 * - 其余情形委托 checkAttach（环 / 重复 / 存在性）。
 */
export function checkDropImpl(
  store: Store,
  edge: EdgeRef,
  task: Task,
  toParent: Task,
  kind: "move" | "link",
): CheckResult {
  if (!store.tasks.has(task.id) || !store.tasks.has(toParent.id)) {
    return { ok: false, reason: "notFound" };
  }

  if (kind === "move") {
    const parent = store.getTask(edge.parentTaskId);
    if (!parent || !parent.children.includes(task.id)) {
      return { ok: false, reason: "notFound" };
    }
    if (edge.parentTaskId === toParent.id) return { ok: true };
  }

  return checkAttach(store, task, toParent);
}
