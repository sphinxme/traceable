import type { EventRevealParticipant } from "$lib/interaction/cross-panel-facade";
import { SegmentRegistry } from "$lib/interaction/segment-registry";
import { REVEAL_HIGHLIGHT_MS, type ScrollState } from "$lib/protocol";

/**
 * WeekPanelController：周历事件段索引 + EventRevealParticipant 实现。
 *
 * 事件查询/布局职责归 WeekController；本类只负责：
 * - SegmentRegistry：eventId → 已挂载的事件段实例；
 * - hover 高亮集合（多事件可并存）；
 * - reveal 单槽 + 短时定时器（最后 reveal 胜）；
 * - 周历滚动记忆（会话级）。
 *
 * 高亮是“hover ∪ reveal 单槽”的派生判断，组件只读 `isHighlighted`。
 */
export class WeekPanelController implements EventRevealParticipant {
  readonly segments = new SegmentRegistry();
  /** 周历滚动记忆（会话级；键 "__panel__"，由 WeekController/ScrollRestoreService 读写）。 */
  readonly scrollMemory = new Map<string, ScrollState>();

  /** hover 高亮 = 周历私有 $state（eventId 集合，多事件可并存）。 */
  #highlighted = $state(new Set<string>());
  /** reveal 单槽：最后 revealEvent 胜；3s 自清，重复 reveal 重置定时器。 */
  #revealSlot = $state<
    { eventId: string; timer: ReturnType<typeof setTimeout> } | undefined
  >(undefined);

  /** EventSegment 派生读：hover ∪ reveal 单槽。 */
  isHighlighted(eventId: string): boolean {
    return (
      this.#highlighted.has(eventId) || this.#revealSlot?.eventId === eventId
    );
  }

  /** 门面路由入口（hover 进/出对称调用）。 */
  highlightEvent(eventId: string, on: boolean): void {
    const next = new Set(this.#highlighted);
    if (on) next.add(eventId);
    else next.delete(eventId);
    this.#highlighted = next;
  }

  /** 选段规则：离"现在"最近的段（|segStart - now| 最小）；无段 no-op。 */
  revealEvent(eventId: string): void {
    const segments = this.segments.segmentsOf(eventId);
    if (segments.length === 0) return;

    const now = Date.now();
    const segment = segments.reduce((a, b) =>
      Math.abs(b.segStart - now) < Math.abs(a.segStart - now) ? b : a,
    );
    segment.scrollIntoView();

    if (this.#revealSlot) clearTimeout(this.#revealSlot.timer);
    this.#revealSlot = {
      eventId,
      timer: setTimeout(() => {
        this.#revealSlot = undefined;
      }, REVEAL_HIGHLIGHT_MS),
    };
  }

  /** 组件卸载 cleanup：清 reveal 定时器。 */
  destroy(): void {
    if (this.#revealSlot) clearTimeout(this.#revealSlot.timer);
    this.#revealSlot = undefined;
  }
}
