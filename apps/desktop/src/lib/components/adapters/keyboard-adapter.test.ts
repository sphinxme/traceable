import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyboardAdapter as KeyboardAdapterType } from "$lib/components/adapters/keyboard-adapter";
import { KeyboardAdapter } from "$lib/components/adapters/keyboard-adapter";
import type { PerformSpec } from "$lib/protocol";
import { devWarn } from "$lib/utils";
import type Quill from "quill";
import type { Context } from "quill/modules/keyboard";
import { toast as mockToast } from "$lib/toast";
import { addTask } from "@/tests/fixtures/document";
import { makeViewFixture, mountHandle } from "@/tests/fixtures/view";

vi.mock("$lib/toast", () => ({ toast: vi.fn() }));
vi.mock("$lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/utils")>();
  return { ...actual, devWarn: vi.fn() };
});

function setup() {
  const fixture = makeViewFixture("panel");
  const a = addTask(fixture.store, fixture.root, "A", "a");
  const a1 = addTask(fixture.store, a, "A1", "a1");
  const b = addTask(fixture.store, fixture.root, "B", "b");
  const b1 = addTask(fixture.store, b, "B1", "b1");
  const c = addTask(fixture.store, fixture.root, "C", "c");

  const rootHandle = mountHandle(fixture.panel, fixture.root);
  const aHandle = mountHandle(fixture.panel, a, rootHandle);
  const a1Handle = mountHandle(fixture.panel, a1, aHandle);
  const bHandle = mountHandle(fixture.panel, b, rootHandle);
  const b1Handle = mountHandle(fixture.panel, b1, bHandle);
  const cHandle = mountHandle(fixture.panel, c, rootHandle);

  const perform = vi
    .spyOn(fixture.panel, "perform")
    .mockResolvedValue({ ok: false, reason: "invalid" });
  const adapter = new KeyboardAdapter(fixture.ops);

  return {
    ...fixture,
    a,
    a1,
    b,
    b1,
    c,
    rootHandle,
    aHandle,
    a1Handle,
    bHandle,
    b1Handle,
    cHandle,
    perform,
    adapter,
  };
}

function quillOf(text: string): Quill {
  return { getText: () => text } as unknown as Quill;
}

function ctxOf(prefix: string, suffix: string): Context {
  return { prefix, suffix, offset: 0 } as unknown as Context;
}

function lastSpec(perform: ReturnType<typeof setup>["perform"]): PerformSpec {
  return perform.mock.calls.at(-1)![0] as PerformSpec;
}

describe("KeyboardAdapter Tab / Shift+Tab", () => {
  it("root 与列表首项守卫返回 false", () => {
    const { adapter, rootHandle, aHandle } = setup();
    expect(adapter.onTab(rootHandle, 0)).toBe(false);
    expect(adapter.onTab(aHandle, 0)).toBe(false);
    expect(adapter.onUntab(rootHandle, 0)).toBe(false);
    expect(adapter.onUntab(aHandle, 0)).toBe(false);
  });

  it("onTab：成为 prev 的末子，animate + focus 形状正确", () => {
    const { adapter, b, bHandle, a, perform } = setup();

    expect(adapter.onTab(bHandle, 5)).toBe(true);
    const spec = lastSpec(perform);
    expect(spec.animate).toEqual({
      kind: "item-move",
      source: bHandle,
      target: { panelId: "panel", homeId: "root", path: ["a", "b"] },
    });
    expect(spec.focus).toEqual({
      ref: { panelId: "panel", homeId: "root", path: ["a", "b"] },
      cursor: 5,
    });

    const result = spec.op();
    expect(result.ok).toBe(true);
    expect(a.children.toIds()).toEqual(["a1", b.id]);
  });

  it("onUntab：成为父的后一兄弟，animate + focus 形状正确", () => {
    const { adapter, b1, b1Handle, perform } = setup();

    expect(adapter.onUntab(b1Handle, 2)).toBe(true);
    const spec = lastSpec(perform);
    expect(spec.animate).toEqual({
      kind: "item-move",
      source: b1Handle,
      target: { panelId: "panel", homeId: "root", path: ["b1"] },
    });
    expect(spec.focus).toEqual({
      ref: { panelId: "panel", homeId: "root", path: ["b1"] },
      cursor: 2,
    });

    expect(spec.op().ok).toBe(true);
    expect(b1.parents.toIds()).toEqual(["root"]);
  });
});

describe("KeyboardAdapter Enter 4-case", () => {
  it("case 1：空文本 + 有爷爷 + 末位 → 委托 onUntab", () => {
    const { adapter, b1Handle } = setup();
    const spy = vi
      .spyOn(adapter as KeyboardAdapterType, "onUntab")
      .mockReturnValue(true);

    expect(
      adapter.onEnter(
        b1Handle,
        { index: 4 } as never,
        ctxOf("", ""),
        quillOf("  "),
      ),
    ).toBe(true);
    expect(spy).toHaveBeenCalledWith(b1Handle, 4);
  });

  it("case 2.1：root 任意光标位 → 子首插", () => {
    const { adapter, rootHandle, perform, root } = setup();

    expect(
      adapter.onEnter(
        rootHandle,
        { index: 3 } as never,
        ctxOf("abc", ""),
        quillOf("abc"),
      ),
    ).toBe(true);
    const spec = lastSpec(perform);
    expect(spec.animate).toBeUndefined();
    const newId = spec.focus!.ref.path.at(-1)!;
    expect(spec.focus).toEqual({
      ref: { panelId: "panel", homeId: "root", path: [newId] },
      cursor: 0,
    });

    expect(spec.op().ok).toBe(true);
    expect(root.children.toIds()[0]).toBe(newId);
  });

  it("case 2.1：非 root 未折叠且有子 → 子首插", () => {
    const { adapter, bHandle, perform, b } = setup();

    adapter.onEnter(
      bHandle,
      { index: 1 } as never,
      ctxOf("B", ""),
      quillOf("B"),
    );
    const spec = lastSpec(perform);
    const newId = spec.focus!.ref.path.at(-1)!;
    expect(spec.focus!.ref.path).toEqual(["b", newId]);

    expect(spec.op().ok).toBe(true);
    expect(b.children.toIds()[0]).toBe(newId);
  });

  it("case 2.2：折叠（或无子）→ 父列表后位插", () => {
    const { adapter, bHandle, perform, root, panel } = setup();
    panel.foldTrees.tree("root").setFolded(["b"], true);

    adapter.onEnter(
      bHandle,
      { index: 1 } as never,
      ctxOf("B", ""),
      quillOf("B"),
    );
    const spec = lastSpec(perform);
    const newId = spec.focus!.ref.path.at(-1)!;
    expect(spec.focus!.ref.path).toEqual([newId]);

    expect(spec.op().ok).toBe(true);
    expect(root.children.toIds()[2]).toBe(newId);
  });

  it("case 3：光标在首部 → 父列表前位插", () => {
    const { adapter, bHandle, perform, root } = setup();

    adapter.onEnter(
      bHandle,
      { index: 0 } as never,
      ctxOf("", "B"),
      quillOf("B"),
    );
    const spec = lastSpec(perform);
    const newId = spec.focus!.ref.path.at(-1)!;
    expect(spec.focus!.ref.path).toEqual([newId]);

    expect(spec.op().ok).toBe(true);
    expect(root.children.toIds()[1]).toBe(newId);
  });

  it("case 4：光标中间 → split，焦点 = 原出现", () => {
    const fixture = makeViewFixture("panel");
    const task = addTask(fixture.store, fixture.root, "HELLO", "task");
    const rootHandle = mountHandle(fixture.panel, fixture.root);
    const handle = mountHandle(fixture.panel, task, rootHandle);
    const perform = vi
      .spyOn(fixture.panel, "perform")
      .mockResolvedValue({ ok: false, reason: "invalid" });
    const adapter = new KeyboardAdapter(fixture.ops);

    adapter.onEnter(
      handle,
      { index: 2 } as never,
      ctxOf("HE", "LLO"),
      quillOf("HELLO"),
    );
    const spec = perform.mock.calls.at(-1)![0] as PerformSpec;
    expect(spec.animate).toBeUndefined();
    expect(spec.focus).toEqual({
      ref: { panelId: "panel", homeId: "root", path: ["task"] },
      cursor: 0,
    });

    expect(spec.op().ok).toBe(true);
    const ids = fixture.root.children.toIds();
    expect(ids[0]).not.toBe("task");
    expect(fixture.store.getTask(ids[0])!.$text).toBe("HE");
    expect(task.$text).toBe("LLO");
  });
});

describe("KeyboardAdapter Shift+Enter / 方向键", () => {
  it("Shift+Enter：root 仅阻止；item 翻转 noteOpen", () => {
    const { adapter, rootHandle, bHandle } = setup();
    expect(adapter.onShiftEnter(rootHandle)).toBe(true);
    expect(rootHandle.noteOpen).toBe(false);

    expect(adapter.onShiftEnter(bHandle)).toBe(true);
    expect(bHandle.noteOpen).toBe(true);
    expect(adapter.onShiftEnter(bHandle)).toBe(true);
    expect(bHandle.noteOpen).toBe(false);
  });

  it("ArrowUp：首项上浮（+2）、有上兄弟走 focusBottom", () => {
    const { adapter, aHandle, b1Handle, cHandle, rootHandle, bHandle } =
      setup();
    const rootEditor = vi.fn<() => boolean>(() => true);
    rootHandle.focusEditor = rootEditor;

    expect(adapter.onArrowUp(aHandle, 5)).toBe(true);
    expect(rootEditor).toHaveBeenCalledWith(7);

    const b1Editor = vi.fn<() => boolean>(() => true);
    b1Handle.focusEditor = b1Editor;
    expect(adapter.onArrowUp(cHandle, 5)).toBe(true);
    expect(b1Editor).toHaveBeenCalledWith(3);

    const bEditor = vi.fn<() => boolean>(() => true);
    bHandle.focusEditor = bEditor;
    expect(adapter.onArrowUp(b1Handle, 5)).toBe(true);
    expect(bEditor).toHaveBeenCalledWith(7);
  });

  it("ArrowDown：展开有子 → 首子（-2）；折叠 → 下兄弟；无子 → focusNext", () => {
    const { adapter, rootHandle, aHandle, bHandle, cHandle, panel, b1Handle } =
      setup();
    const aEditor = vi.fn<() => boolean>(() => true);
    aHandle.focusEditor = aEditor;

    expect(adapter.onArrowDown(rootHandle, 5)).toBe(true);
    expect(aEditor).toHaveBeenCalledWith(3);

    panel.foldTrees.tree("root").setFolded(["b"], true);
    const cEditor = vi.fn<() => boolean>(() => true);
    cHandle.focusEditor = cEditor;
    expect(adapter.onArrowDown(bHandle, 0)).toBe(true);
    expect(cEditor).toHaveBeenCalledWith(0);

    b1Handle.focusEditor = vi.fn<() => boolean>(() => false);
    panel.foldTrees.tree("root").setFolded(["b"], false);
    expect(adapter.onArrowDown(b1Handle, 0)).toBe(true);
    expect(cEditor).toHaveBeenLastCalledWith(2);
  });
});

describe("KeyboardAdapter 失败 UX", () => {
  beforeEach(() => {
    vi.mocked(mockToast).mockClear();
    vi.mocked(devWarn).mockClear();
  });

  it("cycle / duplicate → toast；notFound / invalid → devWarn", async () => {
    const { adapter, bHandle, perform } = setup();

    for (const [reason, sink] of [
      ["cycle", mockToast],
      ["duplicate", mockToast],
    ] as const) {
      perform.mockResolvedValue({ ok: false, reason });
      adapter.onTab(bHandle, 0);
      await Promise.resolve();
      expect(sink).toHaveBeenCalledWith(reason);
    }

    for (const reason of ["notFound", "invalid"] as const) {
      perform.mockResolvedValue({ ok: false, reason });
      adapter.onTab(bHandle, 0);
      await Promise.resolve();
      expect(devWarn).toHaveBeenCalledWith("keyboard op failed", reason);
    }
  });
});
