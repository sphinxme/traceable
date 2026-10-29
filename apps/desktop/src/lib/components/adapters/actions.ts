import { getAppServices } from "$lib/app/context.svelte";
import type { OpFailReason } from "$lib/protocol";
import { toast } from "$lib/toast";
import { devWarn } from "$lib/utils";
import type { Panel } from "$lib/view/panel.svelte";
import type { ViewHandle } from "$lib/view/view-handle.svelte";

/**
 * 右键菜单"删除"：删的是该出现的那条边；是否级联删实体由 T 的其余边决定。
 * 无 animate、无 focus（产品决策待定，PerformSpec.focus 位已留）。
 */
export function remove(panel: Panel, handle: ViewHandle): void {
  if (!handle.parent) return;

  const ops = getAppServices().ops;
  panel
    .perform({
      op: () =>
        ops.remove(
          {
            parentTaskId: handle.parent!.task.id,
            childTaskId: handle.task.id,
          },
          { from: handle.ref() },
        ),
    })
    .then((result) => {
      if (result.ok === false) notifyFail(result.reason);
    });
}

/** home 末位插入空任务（无焦点/无动画）；对任意条目实例通用（插入其子列表末位）。 */
export function addChild(panel: Panel, handle: ViewHandle): void {
  const ops = getAppServices().ops;
  const id = ops.newTaskId();
  panel
    .perform({
      op: () =>
        ops.insert(handle.task, handle.task.children.length, undefined, id, {
          to: {
            panelId: panel.id,
            homeId: handle.homeId,
            path: [...handle.path(), id],
          },
        }),
    })
    .then((result) => {
      if (result.ok === false) notifyFail(result.reason);
    });
}

/** 失败 UX 映射（与 KeyboardAdapter / DnDAdapter 共用）。 */
function notifyFail(reason: OpFailReason): void {
  if (reason === "cycle" || reason === "duplicate") toast(reason);
  else devWarn("action failed", reason);
}
