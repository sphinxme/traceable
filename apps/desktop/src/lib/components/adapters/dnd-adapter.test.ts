import { beforeEach, describe, expect, it, vi } from "vitest";
import { DnDAdapter } from "$lib/components/adapters/dnd-adapter";
import { DragService } from "$lib/interaction/drag-service.svelte";
import type { DropSlot, PerformSpec } from "$lib/protocol";
import { devWarn } from "$lib/utils";
import { toast as mockToast } from "$lib/toast";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import { addTask } from "@/tests/fixtures/document";
import {
  makeFakePanel,
  makeViewFixture,
  mountHandle,
} from "@/tests/fixtures/view";

vi.mock("$lib/toast", () => ({ toast: vi.fn() }));
vi.mock("$lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/utils")>();
  return { ...actual, devWarn: vi.fn() };
});

function setup() {
  const fixture = makeViewFixture("panel");
  const other = makeFakePanel(fixture.panelState, "panel-b");

  const a = addTask(fixture.store, fixture.root, "A", "a");
  const a1 = addTask(fixture.store, a, "A1", "a1");
  const b = addTask(fixture.store, fixture.root, "B", "b");
  const b1 = addTask(fixture.store, b, "B1", "b1");
  const c = addTask(fixture.store, fixture.root, "C", "c");

  const rootB = addTask(fixture.store, undefined, "ROOT-B", "root-b");
  const x = addTask(fixture.store, rootB, "X", "x");

  const rootHandle = mountHandle(fixture.panel, fixture.root);
  const aHandle = mountHandle(fixture.panel, a, rootHandle);
  const a1Handle = mountHandle(fixture.panel, a1, aHandle);
  const bHandle = mountHandle(fixture.panel, b, rootHandle);
  const b1Handle = mountHandle(fixture.panel, b1, bHandle);
  const cHandle = mountHandle(fixture.panel, c, rootHandle);

  const rootBHandle = mountHandle(other, rootB);
  const xHandle = mountHandle(other, x, rootBHandle);

  const performA = vi
    .spyOn(fixture.panel, "perform")
    .mockResolvedValue({ ok: false, reason: "invalid" });
  const performB = vi
    .spyOn(other, "perform")
    .mockResolvedValue({ ok: false, reason: "invalid" });

  const ds = new DragService();
  const adapter = new DnDAdapter(ds, fixture.ops);

  return {
    ...fixture,
    other,
    a,
    a1,
    b,
    b1,
    c,
    rootB,
    x,
    rootHandle,
    aHandle,
    a1Handle,
    bHandle,
    b1Handle,
    cHandle,
    rootBHandle,
    xHandle,
    performA,
    performB,
    ds,
    adapter,
  };
}

function startDrag(adapter: DnDAdapter, handle: ViewHandle) {
  const data = { setData: vi.fn(), effectAllowed: "" };
  adapter.onDragStart({ dataTransfer: data } as unknown as DragEvent, handle);
  return data;
}

function slot(parentHandle: ViewHandle, index: number): DropSlot {
  return { parentHandle, index };
}

function lastSpec(perform: ReturnType<typeof setup>["performA"]): PerformSpec {
  return perform.mock.calls.at(-1)![0] as PerformSpec;
}

describe("DnDAdapter.onDragStart", () => {
  it("root 防御：不 begin、不写 dataTransfer", () => {
    const { adapter, ds, rootHandle } = setup();
    const data = startDrag(adapter, rootHandle);

    expect(ds.active).toBe(false);
    expect(data.setData).not.toHaveBeenCalled();
  });

  it("拖起子任务：payload 定格 + 协议位写入", () => {
    const { adapter, ds, b, bHandle, root } = setup();
    const data = startDrag(adapter, bHandle);

    expect(ds.active).toBe(true);
    expect(ds.payload).toEqual({
      task: b,
      edge: { parentTaskId: root.id, childTaskId: b.id },
      from: { panelId: "panel", homeId: "root", path: ["b"] },
      sourceHandle: bHandle,
    });
    expect(data.setData).toHaveBeenCalledWith("application/x-traceable", "b");
    expect(data.effectAllowed).toBe("linkMove");
  });
});

describe("DnDAdapter.onDragOver 规则表", () => {
  it("pickKind 矩阵 × checkDrop：同/跨面板 × metaKey", () => {
    const { adapter, bHandle, rootHandle, aHandle, rootBHandle } = setup();
    startDrag(adapter, bHandle);

    expect(adapter.onDragOver(slot(rootHandle, 3), false)).toBe("move");
    expect(adapter.onDragOver(slot(aHandle, 1), true)).toBe("link");
    expect(adapter.onDragOver(slot(rootBHandle, 1), false)).toBe("link");
    expect(adapter.onDragOver(slot(rootBHandle, 1), true)).toBe("move");
  });

  it("sameSpot → none；无 payload → none", () => {
    const { adapter, bHandle, rootHandle, ds } = setup();
    startDrag(adapter, bHandle);

    expect(adapter.onDragOver(slot(rootHandle, 1), false)).toBe("none");
    expect(adapter.onDragOver(slot(rootHandle, 2), false)).toBe("none");

    ds.end();
    expect(adapter.onDragOver(slot(rootHandle, 3), false)).toBe("none");
  });

  it("checkDrop 拒绝（cycle）→ none", () => {
    const { adapter, bHandle, b1Handle } = setup();
    startDrag(adapter, bHandle);

    expect(adapter.onDragOver(slot(b1Handle, 0), false)).toBe("none");
  });
});

describe("DnDAdapter.onDrop 定稿", () => {
  it("同父同出现 reorder：item-move 动画", () => {
    const { adapter, bHandle, rootHandle, performA, root } = setup();
    startDrag(adapter, bHandle);

    adapter.onDrop(slot(rootHandle, 3), false);
    const spec = lastSpec(performA);
    expect(spec.animate).toEqual({
      kind: "item-move",
      source: bHandle,
      target: { panelId: "panel", homeId: "root", path: ["b"] },
    });
    expect(spec.focus).toBeUndefined();

    expect(spec.op().ok).toBe(true);
    expect(root.children.toIds()).toEqual(["a", "c", "b"]);
  });

  it("同树 reparent：item-move 动画 + 真搬", () => {
    const { adapter, b, bHandle, aHandle, performA } = setup();
    startDrag(adapter, bHandle);

    adapter.onDrop(slot(aHandle, 1), false);
    const spec = lastSpec(performA);
    expect(spec.animate).toEqual({
      kind: "item-move",
      source: bHandle,
      target: { panelId: "panel", homeId: "root", path: ["a", "b"] },
    });

    expect(spec.op().ok).toBe(true);
    expect(b.parents.toIds()).toEqual(["a"]);
  });

  it("同父跨出现 reorder：无动画（新快照重名风险）", () => {
    const fixture = makeViewFixture("panel");
    const g1 = addTask(fixture.store, fixture.root, "G1", "g1");
    const g2 = addTask(fixture.store, fixture.root, "G2", "g2");
    const p = addTask(fixture.store, g1, "P", "p");
    g2.attachChild(p);
    const u = addTask(fixture.store, p, "U", "u");
    const t = addTask(fixture.store, p, "T", "t");

    const rootHandle = mountHandle(fixture.panel, fixture.root);
    const g1Handle = mountHandle(fixture.panel, g1, rootHandle);
    const g2Handle = mountHandle(fixture.panel, g2, rootHandle);
    const p1Handle = mountHandle(fixture.panel, p, g1Handle);
    const p2Handle = mountHandle(fixture.panel, p, g2Handle);
    mountHandle(fixture.panel, u, p2Handle);
    const tHandle = mountHandle(fixture.panel, t, p1Handle);
    const perform = vi
      .spyOn(fixture.panel, "perform")
      .mockResolvedValue({ ok: false, reason: "invalid" });
    const ds = new DragService();
    const adapter = new DnDAdapter(ds, fixture.ops);

    startDrag(adapter, tHandle);
    adapter.onDrop(slot(p2Handle, 0), false);

    const spec = perform.mock.calls.at(-1)![0] as PerformSpec;
    expect(spec.animate).toBeUndefined();
    expect(spec.op().ok).toBe(true);
    expect(p.children.toIds()).toEqual(["t", "u"]);
  });

  it("同面板 +meta → link：无动画、无焦点，建立第二条边", () => {
    const { adapter, b, bHandle, aHandle, performA } = setup();
    startDrag(adapter, bHandle);

    adapter.onDrop(slot(aHandle, 0), true);
    const spec = lastSpec(performA);
    expect(spec.animate).toBeUndefined();
    expect(spec.focus).toBeUndefined();

    expect(spec.op().ok).toBe(true);
    expect(b.parents.toIds().sort()).toEqual(["a", "root"]);
  });

  it("跨面板默认 link：由目标面板 perform", () => {
    const { adapter, b, bHandle, rootBHandle, performA, performB } = setup();
    startDrag(adapter, bHandle);

    adapter.onDrop(slot(rootBHandle, 1), false);
    expect(performA).not.toHaveBeenCalled();
    const spec = performB.mock.calls.at(-1)![0] as PerformSpec;
    expect(spec.animate).toBeUndefined();
    expect(spec.op().ok).toBe(true);
    expect(b.parents.toIds().sort()).toEqual(["root", "root-b"]);
  });

  it("sameSpot / 无 payload：不发起 perform", () => {
    const { adapter, bHandle, rootHandle, performA, ds } = setup();
    startDrag(adapter, bHandle);

    adapter.onDrop(slot(rootHandle, 1), false);
    expect(performA).not.toHaveBeenCalled();

    ds.end();
    adapter.onDrop(slot(rootHandle, 3), false);
    expect(performA).not.toHaveBeenCalled();
  });
});

describe("DnDAdapter 生命周期与失败 UX", () => {
  beforeEach(() => {
    vi.mocked(mockToast).mockClear();
    vi.mocked(devWarn).mockClear();
  });

  it("dragend 终结会话", () => {
    const { adapter, ds, bHandle } = setup();
    startDrag(adapter, bHandle);
    expect(ds.active).toBe(true);

    adapter.onDragEnd();
    expect(ds.active).toBe(false);
    expect(ds.payload).toBeUndefined();
  });

  it("cycle / duplicate → toast；notFound / invalid → devWarn", async () => {
    const { adapter, bHandle, rootHandle, performA } = setup();

    for (const [reason, sink] of [
      ["cycle", mockToast],
      ["duplicate", mockToast],
    ] as const) {
      startDrag(adapter, bHandle);
      performA.mockResolvedValue({ ok: false, reason });
      adapter.onDrop(slot(rootHandle, 3), false);
      await Promise.resolve();
      expect(sink).toHaveBeenCalledWith(reason);
      adapter.onDragEnd();
    }

    for (const reason of ["notFound", "invalid"] as const) {
      startDrag(adapter, bHandle);
      performA.mockResolvedValue({ ok: false, reason });
      adapter.onDrop(slot(rootHandle, 3), false);
      await Promise.resolve();
      expect(devWarn).toHaveBeenCalledWith("drop op failed", reason);
      adapter.onDragEnd();
    }
  });
});
