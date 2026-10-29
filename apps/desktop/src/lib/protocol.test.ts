import { describe, expect, it, vi } from "vitest";
import {
  REVEAL_HIGHLIGHT_MS,
  isValidRef,
  sameOccurrence,
  samePath,
  toParentOf,
  type OccurrenceRef,
} from "$lib/protocol";
import { devAssert, devWarn, devWarnOnce } from "$lib/utils";

function ref(panelId = "p", homeId = "h", path: string[] = []): OccurrenceRef {
  return { panelId, homeId, path };
}

describe("samePath", () => {
  it("同引用短路", () => {
    const path = ["a", "b"];
    expect(samePath(path, path)).toBe(true);
  });

  it("等长逐项相等", () => {
    expect(samePath(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("长度不同", () => {
    expect(samePath(["a"], ["a", "b"])).toBe(false);
  });

  it("元素不同", () => {
    expect(samePath(["a", "b"], ["a", "c"])).toBe(false);
  });
});

describe("sameOccurrence", () => {
  it("三元组相等", () => {
    expect(sameOccurrence(ref("p", "h", ["a"]), ref("p", "h", ["a"]))).toBe(
      true,
    );
  });

  it("panelId 不等", () => {
    expect(sameOccurrence(ref("p1"), ref("p2"))).toBe(false);
  });

  it("homeId 不等", () => {
    expect(sameOccurrence(ref("p", "h1"), ref("p", "h2"))).toBe(false);
  });

  it("path 不等", () => {
    expect(sameOccurrence(ref("p", "h", ["a"]), ref("p", "h", ["b"]))).toBe(
      false,
    );
  });
});

describe("toParentOf", () => {
  it("空 path → homeId", () => {
    expect(toParentOf(ref("p", "h", []))).toBe("h");
  });

  it("单元素 path → homeId", () => {
    expect(toParentOf(ref("p", "h", ["a"]))).toBe("h");
  });

  it("多元素 path → 倒数第二个元素", () => {
    expect(toParentOf(ref("p", "h", ["a", "b"]))).toBe("a");
    expect(toParentOf(ref("p", "h", ["a", "b", "c"]))).toBe("b");
  });
});

describe("isValidRef", () => {
  it("合法（含空 path）", () => {
    expect(isValidRef(ref("p", "h"))).toBe(true);
    expect(isValidRef(ref("p", "h", ["a"]))).toBe(true);
  });

  it("panelId / homeId 为空", () => {
    expect(isValidRef(ref("", "h"))).toBe(false);
    expect(isValidRef(ref("p", ""))).toBe(false);
  });

  it("path 非数组", () => {
    expect(
      isValidRef({ panelId: "p", homeId: "h", path: "a" as unknown as [] }),
    ).toBe(false);
  });

  it("path 含空字符串", () => {
    expect(isValidRef(ref("p", "h", [""]))).toBe(false);
  });

  it("path 含非字符串", () => {
    expect(
      isValidRef({ panelId: "p", homeId: "h", path: [1 as unknown as string] }),
    ).toBe(false);
  });
});

describe("常量", () => {
  it("REVEAL_HIGHLIGHT_MS === 3000", () => {
    expect(REVEAL_HIGHLIGHT_MS).toBe(3000);
  });
});

describe("dev 工具", () => {
  it("devAssert 条件为假时抛出", () => {
    expect(() => devAssert(false, "boom")).toThrow("boom");
  });

  it("devAssert 条件为真时不抛", () => {
    expect(() => devAssert(true)).not.toThrow();
  });

  it("devWarn 调用 console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    devWarn("warn-message", 1);
    expect(spy).toHaveBeenCalledWith("warn-message", 1);
    spy.mockRestore();
  });

  it("devWarnOnce 按 key 只告警一次", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    devWarnOnce("once-key", "once-message");
    devWarnOnce("once-key", "once-message");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
