import { beforeEach, describe, expect, it, vi } from "vitest";
import { addChild, remove } from "$lib/components/adapters/actions";
import { setAppServices, type AppServices } from "$lib/app/context.svelte";
import type { PerformSpec } from "$lib/protocol";
import { devWarn } from "$lib/utils";
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
  setAppServices({ ops: fixture.ops } as unknown as AppServices);
  const a = addTask(fixture.store, fixture.root, "A", "a");
  const b = addTask(fixture.store, a, "B", "b");
  const rootHandle = mountHandle(fixture.panel, fixture.root);
  const aHandle = mountHandle(fixture.panel, a, rootHandle);
  const bHandle = mountHandle(fixture.panel, b, aHandle);
  const perform = vi
    .spyOn(fixture.panel, "perform")
    .mockResolvedValue({ ok: false, reason: "invalid" });
  return { ...fixture, a, b, rootHandle, aHandle, bHandle, perform };
}

function lastSpec(perform: ReturnType<typeof setup>["perform"]): PerformSpec {
  return perform.mock.calls.at(-1)![0] as PerformSpec;
}

describe("actions.remove", () => {
  it("root 防御：不发起 perform", () => {
    const { rootHandle, perform, panel } = setup();
    remove(panel, rootHandle);
    expect(perform).not.toHaveBeenCalled();
  });

  it("删除该出现的边（无 animate / focus），op 执行后实体级联删除", () => {
    const { panel, bHandle, perform, store } = setup();

    remove(panel, bHandle);
    const spec = lastSpec(perform);
    expect(spec.animate).toBeUndefined();
    expect(spec.focus).toBeUndefined();

    expect(spec.op().ok).toBe(true);
    expect(store.getTask("b")).toBeUndefined();
  });

  it("失败 UX：cycle → toast；notFound → devWarn", async () => {
    const { panel, bHandle, perform } = setup();

    perform.mockResolvedValue({ ok: false, reason: "cycle" });
    remove(panel, bHandle);
    await Promise.resolve();
    expect(mockToast).toHaveBeenCalledWith("cycle");

    perform.mockResolvedValue({ ok: false, reason: "notFound" });
    remove(panel, bHandle);
    await Promise.resolve();
    expect(devWarn).toHaveBeenCalledWith("action failed", "notFound");
  });
});

describe("actions.addChild", () => {
  it("在条目实例子列表末位插入空任务（无 animate / focus）", () => {
    const { panel, rootHandle, perform, root, ops } = setup();
    const before = root.children.length;
    vi.spyOn(ops, "newTaskId").mockReturnValue("new-id");

    addChild(panel, rootHandle);
    const spec = lastSpec(perform);
    expect(spec.animate).toBeUndefined();
    expect(spec.focus).toBeUndefined();

    expect(spec.op().ok).toBe(true);
    expect(root.children.length).toBe(before + 1);
    expect(root.children.toIds().at(-1)).toBe("new-id");
    expect(root.children.toArray().at(-1)!.$text).toBe("");
  });

  it("失败 UX：duplicate → toast", async () => {
    const { panel, rootHandle, perform } = setup();
    perform.mockResolvedValue({ ok: false, reason: "duplicate" });

    addChild(panel, rootHandle);
    await Promise.resolve();
    expect(mockToast).toHaveBeenCalledWith("duplicate");
  });
});
