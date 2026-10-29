import type { OccurrenceRef, RevealOpts } from "$lib/protocol";
import type { ViewHandle } from "$lib/view/view-handle.svelte";

/** 大纲类面板实现（EditorPanel / JournalPanel 结构化满足）。 */
export interface TaskRevealParticipant {
  /** 数据域搜索：产出 OccurrenceRef 列表（方言由参与者自持）。 */
  findOccurrencePaths(taskId: string): OccurrenceRef[];
  /** 定位并呈现；ref 归一化是 reveal 私有步，门面不感知方言。 */
  reveal(
    ref: OccurrenceRef,
    opts?: RevealOpts,
  ): Promise<ViewHandle | undefined>;
}

/** 周历实现（WeekPanelController）。 */
export interface EventRevealParticipant {
  highlightEvent(eventId: string, on: boolean): void;
  revealEvent(eventId: string): void;
}

/**
 * CrossPanelFacade：跨面板定向路由 + 循环切换游标。
 *
 * 搜索在参与者（数据域）、呈现也在参与者（reveal），门面只做路由与游标记忆。
 */
export class CrossPanelFacade {
  #taskParticipants = new Set<TaskRevealParticipant>();
  #eventParticipants = new Set<EventRevealParticipant>();
  /** taskId → 当前循环下标（唯一可变状态；会话级）。 */
  #cycle = new Map<string, number>();

  // —— 注册（组件挂载 effect / cleanup 对称）——

  registerTaskParticipant(participant: TaskRevealParticipant): void {
    this.#taskParticipants.add(participant);
  }

  unregisterTaskParticipant(participant: TaskRevealParticipant): void {
    this.#taskParticipants.delete(participant);
    // 保守：游标全清——位置是易失 UX，重置无害
    this.#cycle.clear();
  }

  registerEventParticipant(participant: EventRevealParticipant): void {
    this.#eventParticipants.add(participant);
  }

  unregisterEventParticipant(participant: EventRevealParticipant): void {
    this.#eventParticipants.delete(participant);
  }

  // —— 路由 ——

  /**
   * 收集各参与者 refs → 同 task 循环选中下一个 → 定向 reveal（fire-and-forget）。
   *
   * 每次点击都重新搜索：出现数并发变化时取模天然退化正确；
   * 游标是会话级 UX，参与者注销时整体清空。
   */
  focusTask(taskId: string): void {
    const found = [...this.#taskParticipants].flatMap((participant) =>
      participant
        .findOccurrencePaths(taskId)
        .map((ref) => ({ participant, ref })),
    );
    if (found.length === 0) return;

    const previous = this.#cycle.get(taskId);
    const index = previous === undefined ? 0 : (previous + 1) % found.length;
    this.#cycle.set(taskId, index);

    void found[index].participant.reveal(found[index].ref, {
      scroll: true,
      highlight: true,
    });
  }

  highlightEvent(eventId: string, on: boolean): void {
    for (const participant of this.#eventParticipants) {
      participant.highlightEvent(eventId, on);
    }
  }

  revealEvent(eventId: string): void {
    for (const participant of this.#eventParticipants) {
      participant.revealEvent(eventId);
    }
  }
}
