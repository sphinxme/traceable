import { describe, expect, it, vi } from "vitest";
import { TransitionRun } from "$lib/interaction/transition-run";
import type { AnimateSpec, OccurrenceRef } from "$lib/protocol";
import { devWarn } from "$lib/utils";
import type { Panel } from "$lib/view/panel.svelte";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import { makeViewFixture } from "@/tests/fixtures/view";

vi.mock("$lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/utils")>();
  return { ...actual, devWarn: vi.fn() };
});

function targetRef(path: string[] = ["a"]): OccurrenceRef {
  return { panelId: "panel", homeId: "root", path };
}

interface FakeHandle {
  setTransitionName: ReturnType<typeof vi.fn>;
  clearTransitionName: ReturnType<typeof vi.fn>;
  names: Map<string, string>;
}

function fakeHandle(): FakeHandle {
  const names = new Map<string, string>();
  return {
    names,
    setTransitionName: vi.fn((part: string, name: string) => {
      names.set(part, name);
    }),
    clearTransitionName: vi.fn((part: string, name: string) => {
      if (names.get(part) === name) names.delete(part);
    }),
  };
}

function setup(animate?: Partial<AnimateSpec>) {
  const fixture = makeViewFixture();
  const source = fakeHandle();
  const target = fakeHandle();
  const resolve = vi.spyOn(fixture.panel.registry, "resolve");
  resolve.mockReturnValue(target as unknown as ViewHandle);

  const run = new TransitionRun(fixture.panel as Panel, {
    kind: "item-move",
    source: source as unknown as ViewHandle,
    target: targetRef(),
    ...animate,
  });
  return { ...fixture, run, source, target, resolve };
}

describe("TransitionRun 构造与命名", () => {
  it("nonce 全局单调、parts 按 kind 映射", () => {
    const first = setup();
    const second = setup({ kind: "zoom" });

    expect(first.run.nonce).toMatch(/^vt-\d+$/);
    expect(Number(second.run.nonce.slice(3))).toBeGreaterThan(
      Number(first.run.nonce.slice(3)),
    );
    expect(first.run.parts).toEqual(["self"]);
    expect(second.run.parts).toEqual(["title", "list"]);
  });

  it("nameSource 只写源端，每个 part 独立命名", () => {
    const { run, source, target } = setup({ kind: "zoom" });

    run.nameSource();
    expect(source.setTransitionName).toHaveBeenCalledWith(
      "title",
      `${run.nonce}-title`,
    );
    expect(source.setTransitionName).toHaveBeenCalledWith(
      "list",
      `${run.nonce}-list`,
    );
    expect(target.setTransitionName).not.toHaveBeenCalled();
  });

  it("record 前 nameTarget 为 no-op", () => {
    const { run, target, resolve } = setup();

    run.nameTarget();
    expect(resolve).not.toHaveBeenCalled();
    expect(target.setTransitionName).not.toHaveBeenCalled();
  });
});

describe("TransitionRun 状态机", () => {
  it("record 落定 done；nameTarget 在 settle 后写目标端", async () => {
    const { run, source, target, resolve } = setup();
    const result = { ok: true, change: { op: "inserted" as const } };

    run.nameSource();
    run.record(result as never);

    expect(await run.done).toBe(result);

    run.nameTarget();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(target.setTransitionName).toHaveBeenCalledWith(
      "self",
      `${run.nonce}-self`,
    );
  });

  it("cleanup 比较清除两端命名，且只 resolve 一次（使用记录的条目实例）", () => {
    const { run, source, target, resolve } = setup();
    run.nameSource();
    run.record({ ok: true, change: { op: "inserted" } } as never);
    run.nameTarget();

    run.cleanup();
    expect(source.clearTransitionName).toHaveBeenCalledWith(
      "self",
      `${run.nonce}-self`,
    );
    expect(target.clearTransitionName).toHaveBeenCalledWith(
      "self",
      `${run.nonce}-self`,
    );
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("abort 落定失败结果、不清命名；cleanup 后才清源端", async () => {
    const { run, source, target } = setup();
    const failure = { ok: false, reason: "cycle" } as const;

    run.nameSource();
    run.abort(failure);

    expect(await run.done).toBe(failure);
    expect(source.clearTransitionName).not.toHaveBeenCalled();

    run.nameTarget();
    expect(target.setTransitionName).not.toHaveBeenCalled();

    run.cleanup();
    expect(source.clearTransitionName).toHaveBeenCalledWith(
      "self",
      `${run.nonce}-self`,
    );
  });

  it("各状态守卫拒绝非法迁移", async () => {
    const { run, source } = setup();
    const success = { ok: true, change: { op: "inserted" } } as never;

    run.nameSource();
    expect(source.setTransitionName).toHaveBeenCalledTimes(1);

    run.record(success);
    run.record({ ok: false, reason: "invalid" } as never);
    run.abort({ ok: false, reason: "invalid" } as never);
    expect(await run.done).toBe(success);

    run.nameSource();
    expect(source.setTransitionName).toHaveBeenCalledTimes(1);
  });

  it("cleanup 幂等：重复调用不再触碰命名", () => {
    const { run, source } = setup();
    run.nameSource();

    run.cleanup();
    run.cleanup();
    expect(source.clearTransitionName).toHaveBeenCalledTimes(1);
  });

  it("nameTarget miss：devWarn 且不抛错，cleanup 只清源端", () => {
    const { run, source, resolve } = setup();
    resolve.mockReturnValue(undefined);

    run.nameSource();
    run.record({ ok: true, change: { op: "inserted" } } as never);
    expect(() => run.nameTarget()).not.toThrow();
    expect(vi.mocked(devWarn)).toHaveBeenCalled();

    run.cleanup();
    expect(source.clearTransitionName).toHaveBeenCalledTimes(1);
  });
});
