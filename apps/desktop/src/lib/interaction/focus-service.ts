import type { FocusRequest } from "$lib/protocol";
import { devWarn } from "$lib/utils";
import type { PanelDirectory } from "$lib/view/panel-directory";

/**
 * FocusService：按 OccurrenceRef 即时解析焦点（唯一客户 = perform）。
 *
 * 无 pending、无队列、无重试——调用时点由 perform 保证合法（非动画：settle 后；
 * 动画：vt.finished 后，含 skip）。miss = no-op + devWarn，绝不命中错误节点。
 */
export class FocusService {
  constructor(private readonly directory: PanelDirectory) {}

  requestFocus(req: FocusRequest): void {
    const panel = this.directory.get(req.ref.panelId);
    if (!panel) {
      devWarn("focus miss (panel not mounted)", req.ref);
      return;
    }
    const handle = panel.registry.resolve(req.ref);
    if (!handle) {
      devWarn("focus miss (strict resolve)", req.ref);
      return;
    }
    if (!handle.focusEditor(req.cursor)) {
      devWarn("focusEditor refused", req.ref);
    }
  }
}
