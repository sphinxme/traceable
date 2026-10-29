import { describe, expect, it } from "vitest";
import { WeekPanelController } from "$lib/components/calendar/week/WeekPanelController.svelte";
import type { SegmentHandle } from "$lib/interaction/segment-registry";
import { createProbe } from "@/tests/fixtures/reactivity.svelte";

function segment(eventId: string, segStart: number): SegmentHandle {
  return {
    eventId,
    dayIndex: 0,
    segStart,
    scrollIntoView: () => {},
    setHighlight: () => {},
  };
}

describe("WeekPanelController 响应式", () => {
  it("#revealSlot 替换驱动派生更新（reveal 即时翻转、destroy 清除）", () => {
    const controller = new WeekPanelController();
    controller.segments.register(segment("e1", Date.now()));
    const probe = createProbe(() => controller.isHighlighted("e1"));

    expect(probe.values).toEqual([false]);

    controller.revealEvent("e1");
    probe.flush();
    expect(probe.values.at(-1)).toBe(true);

    controller.destroy();
    probe.flush();
    expect(probe.values.at(-1)).toBe(false);

    probe.stop();
  });

  it("#highlighted 替换驱动派生更新", () => {
    const controller = new WeekPanelController();
    const probe = createProbe(() => controller.isHighlighted("e1"));

    controller.highlightEvent("e1", true);
    probe.flush();
    expect(probe.values.at(-1)).toBe(true);

    controller.highlightEvent("e1", false);
    probe.flush();
    expect(probe.values.at(-1)).toBe(false);

    probe.stop();
  });
});
