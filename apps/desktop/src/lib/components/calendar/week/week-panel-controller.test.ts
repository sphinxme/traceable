import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeekPanelController } from "$lib/components/calendar/week/WeekPanelController.svelte";
import type { SegmentHandle } from "$lib/interaction/segment-registry";

function segment(eventId: string, segStart: number): SegmentHandle {
  return {
    eventId,
    dayIndex: 0,
    segStart,
    scrollIntoView: vi.fn(),
    setHighlight: vi.fn(),
  };
}

describe("WeekPanelController", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_000_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isHighlighted = hover ∪ reveal 单槽", () => {
    const controller = new WeekPanelController();
    controller.segments.register(segment("e2", 999_000));

    expect(controller.isHighlighted("e1")).toBe(false);

    controller.highlightEvent("e1", true);
    expect(controller.isHighlighted("e1")).toBe(true);
    expect(controller.isHighlighted("e2")).toBe(false);

    controller.highlightEvent("e1", false);
    expect(controller.isHighlighted("e1")).toBe(false);

    controller.revealEvent("e2");
    expect(controller.isHighlighted("e2")).toBe(true);
  });

  it("revealEvent 选 |segStart - now| 最近的段", () => {
    const controller = new WeekPanelController();
    const far = segment("e1", 0);
    const near = segment("e1", 999_000);
    const future = segment("e1", 2_000_000);
    controller.segments.register(far);
    controller.segments.register(near);
    controller.segments.register(future);

    controller.revealEvent("e1");

    expect(near.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(far.scrollIntoView).not.toHaveBeenCalled();
    expect(future.scrollIntoView).not.toHaveBeenCalled();
  });

  it("重复 reveal 重置定时器；旧槽定时器不误清新槽", () => {
    const controller = new WeekPanelController();
    controller.segments.register(segment("e1", 1_000_000));

    controller.revealEvent("e1");
    vi.advanceTimersByTime(2000);

    controller.revealEvent("e1");
    vi.advanceTimersByTime(2000);
    expect(controller.isHighlighted("e1")).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(controller.isHighlighted("e1")).toBe(false);
  });

  it("revealEvent 切目标：旧事件高亮立即消失", () => {
    const controller = new WeekPanelController();
    controller.segments.register(segment("e1", 1_000_000));
    controller.segments.register(segment("e2", 1_000_000));

    controller.revealEvent("e1");
    controller.revealEvent("e2");

    expect(controller.isHighlighted("e1")).toBe(false);
    expect(controller.isHighlighted("e2")).toBe(true);
  });

  it("无段 → no-op（不抛错、不高亮）", () => {
    const controller = new WeekPanelController();
    expect(() => controller.revealEvent("missing")).not.toThrow();
    expect(controller.isHighlighted("missing")).toBe(false);
  });

  it("destroy 清理定时器", () => {
    const controller = new WeekPanelController();
    controller.segments.register(segment("e1", 1_000_000));
    controller.revealEvent("e1");

    controller.destroy();
    vi.advanceTimersByTime(3000);
    expect(controller.isHighlighted("e1")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
