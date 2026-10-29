import { describe, expect, it, vi } from "vitest";
import {
  CrossPanelFacade,
  type EventRevealParticipant,
  type TaskRevealParticipant,
} from "$lib/interaction/cross-panel-facade";
import type { OccurrenceRef } from "$lib/protocol";

function ref(panelId: string, homeId: string, path: string[]): OccurrenceRef {
  return { panelId, homeId, path };
}

function makeParticipant(refs: OccurrenceRef[]) {
  return {
    findOccurrencePaths: vi.fn(() => refs),
    reveal: vi.fn(async () => undefined),
  } satisfies TaskRevealParticipant;
}

describe("CrossPanelFacade.focusTask", () => {
  it("收集序确定；首次 0，随后 1 → 2 → 0 循环", () => {
    const facade = new CrossPanelFacade();
    const revealed: OccurrenceRef[] = [];
    const record = (
      participant: TaskRevealParticipant,
    ): TaskRevealParticipant => ({
      findOccurrencePaths: participant.findOccurrencePaths,
      reveal: vi.fn(async (occurrence) => {
        revealed.push(occurrence);
        return undefined;
      }),
    });
    const first = record(
      makeParticipant([ref("a", "h", ["x"]), ref("a", "h", ["y"])]),
    );
    const second = record(makeParticipant([ref("b", "h", ["z"])]));
    facade.registerTaskParticipant(first);
    facade.registerTaskParticipant(second);

    facade.focusTask("t");
    facade.focusTask("t");
    facade.focusTask("t");
    facade.focusTask("t");

    expect(revealed).toEqual([
      ref("a", "h", ["x"]),
      ref("a", "h", ["y"]),
      ref("b", "h", ["z"]),
      ref("a", "h", ["x"]),
    ]);
    expect(first.reveal).toHaveBeenCalledWith(expect.anything(), {
      scroll: true,
      highlight: true,
    });
    expect(first.findOccurrencePaths).toHaveBeenCalledTimes(4);
    expect(second.findOccurrencePaths).toHaveBeenCalledTimes(4);
  });

  it("每次重搜：出现数变化后取模退化正确", () => {
    const facade = new CrossPanelFacade();
    const refs = [ref("a", "h", ["x"]), ref("a", "h", ["y"])];
    const participant = makeParticipant(refs);
    facade.registerTaskParticipant(participant);

    facade.focusTask("t");
    facade.focusTask("t");
    expect(participant.reveal).toHaveBeenLastCalledWith(
      refs[1],
      expect.anything(),
    );

    participant.findOccurrencePaths.mockReturnValue([refs[0]]);
    facade.focusTask("t");
    expect(participant.reveal).toHaveBeenLastCalledWith(
      refs[0],
      expect.anything(),
    );
  });

  it("不可达：静默（不 reveal、不抛错）", () => {
    const facade = new CrossPanelFacade();
    const participant = makeParticipant([]);
    facade.registerTaskParticipant(participant);

    expect(() => facade.focusTask("missing")).not.toThrow();
    expect(participant.reveal).not.toHaveBeenCalled();
  });

  it("不同 task 各自独立游标", () => {
    const facade = new CrossPanelFacade();
    const participant = makeParticipant([
      ref("a", "h1", ["x"]),
      ref("a", "h2", ["x"]),
    ]);
    facade.registerTaskParticipant(participant);

    facade.focusTask("t1");
    facade.focusTask("t2");
    expect(participant.reveal).toHaveBeenNthCalledWith(
      1,
      ref("a", "h1", ["x"]),
      expect.anything(),
    );
    expect(participant.reveal).toHaveBeenNthCalledWith(
      2,
      ref("a", "h1", ["x"]),
      expect.anything(),
    );
  });

  it("unregisterTaskParticipant 清空游标", () => {
    const facade = new CrossPanelFacade();
    const participant = makeParticipant([
      ref("a", "h", ["x"]),
      ref("a", "h", ["y"]),
    ]);
    facade.registerTaskParticipant(participant);

    facade.focusTask("t");
    facade.focusTask("t");
    participant.reveal.mockClear();

    facade.unregisterTaskParticipant(participant);
    facade.registerTaskParticipant(participant);
    facade.focusTask("t");

    expect(participant.reveal).toHaveBeenCalledWith(
      ref("a", "h", ["x"]),
      expect.anything(),
    );
  });
});

describe("CrossPanelFacade 事件路由", () => {
  function makeEventParticipant() {
    return {
      highlightEvent: vi.fn(),
      revealEvent: vi.fn(),
    } satisfies EventRevealParticipant;
  }

  it("highlightEvent / revealEvent 路由到全部事件参与者", () => {
    const facade = new CrossPanelFacade();
    const first = makeEventParticipant();
    const second = makeEventParticipant();
    facade.registerEventParticipant(first);
    facade.registerEventParticipant(second);

    facade.highlightEvent("e1", true);
    facade.highlightEvent("e1", false);
    facade.revealEvent("e2");

    for (const participant of [first, second]) {
      expect(participant.highlightEvent).toHaveBeenNthCalledWith(1, "e1", true);
      expect(participant.highlightEvent).toHaveBeenNthCalledWith(
        2,
        "e1",
        false,
      );
      expect(participant.revealEvent).toHaveBeenCalledWith("e2");
    }
  });

  it("注销后不再收到路由", () => {
    const facade = new CrossPanelFacade();
    const participant = makeEventParticipant();
    facade.registerEventParticipant(participant);
    facade.unregisterEventParticipant(participant);

    facade.revealEvent("e1");
    expect(participant.revealEvent).not.toHaveBeenCalled();
  });
});
