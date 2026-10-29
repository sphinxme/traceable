import { describe, expect, it, vi } from "vitest";
import {
  SegmentRegistry,
  type SegmentHandle,
} from "$lib/interaction/segment-registry";

function handle(eventId: string, segStart = 0): SegmentHandle {
  return {
    eventId,
    dayIndex: 0,
    segStart,
    scrollIntoView: vi.fn(),
    setHighlight: vi.fn(),
  };
}

describe("SegmentRegistry", () => {
  it("登记/注销对称；Set 空删键", () => {
    const registry = new SegmentRegistry();
    const first = handle("e1");
    const second = handle("e1");
    const other = handle("e2");

    registry.register(first);
    registry.register(second);
    registry.register(other);
    expect(registry.segmentsOf("e1")).toEqual([first, second]);
    expect(registry.segmentsOf("e2")).toEqual([other]);

    registry.unregister(first);
    expect(registry.segmentsOf("e1")).toEqual([second]);
    registry.unregister(second);
    expect(registry.segmentsOf("e1")).toEqual([]);
    expect(registry.segmentsOf("e2")).toEqual([other]);
  });

  it("重复注销 / 注销未登记的事件段实例为 no-op", () => {
    const registry = new SegmentRegistry();
    const segment = handle("e1");
    registry.register(segment);
    registry.unregister(segment);

    expect(() => registry.unregister(segment)).not.toThrow();
    expect(() => registry.unregister(handle("missing"))).not.toThrow();
  });

  it("segmentsOf 返回拷贝快照（并发注销安全）", () => {
    const registry = new SegmentRegistry();
    const segment = handle("e1");
    registry.register(segment);

    const snapshot = registry.segmentsOf("e1");
    registry.unregister(segment);

    expect(snapshot).toEqual([segment]);
    expect(registry.segmentsOf("e1")).toEqual([]);
  });
});
