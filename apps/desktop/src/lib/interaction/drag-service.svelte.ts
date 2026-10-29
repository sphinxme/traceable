import type { DragPayload } from "$lib/protocol";

/**
 * DragService：手势唯一会话态（只存事实，不做逻辑）。
 *
 * 状态机：idle --begin--> dragging --end--> idle。
 * 写者唯一 = DnDAdapter（dragstart / dragend）；组件层只做反应式读（I9）。
 */
export class DragService {
  /** 组件层唯一反应式读点。 */
  active = $state(false);
  payload = $state<DragPayload | undefined>(undefined);

  /** 拖起时定格载荷；连发 dragstart 防御：先结算上一会话。 */
  begin(payload: DragPayload): void {
    if (this.active) this.#endInternal();
    this.payload = payload;
    this.active = true;
  }

  /** dragend（正常/被拒/取消）唯一出口；幂等。 */
  end(): void {
    this.#endInternal();
  }

  #endInternal(): void {
    if (!this.active) return;
    this.payload = undefined;
    this.active = false;
  }
}
