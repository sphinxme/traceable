import { describe, expect, it } from "vitest";
import type { Store } from "$lib/document/entities/store.svelte";
import { checkAttach, checkDropImpl } from "$lib/outline-ops/check";
import type { EdgeRef } from "$lib/protocol";
import {
  addTask,
  countTransactions,
  makeDocumentFixture,
  snapshot,
} from "@/tests/fixtures/document";

function setup() {
  const fixture = makeDocumentFixture();
  const { store, root } = fixture;
  const a = addTask(store, root, "A", "A");
  const b = addTask(store, root, "B", "B");
  const t = addTask(store, a, "T", "T");
  const c = addTask(store, root, "C", "C");
  return { ...fixture, a, b, t, c };
}

function edgeOf(parentId: string, childId: string): EdgeRef {
  return { parentTaskId: parentId, childTaskId: childId };
}

function expectPure<T>(store: Store, fn: () => T): T {
  const before = snapshot(store);
  let result!: T;
  const count = countTransactions(store.doc, () => {
    result = fn();
  });
  expect(count).toBe(0);
  expect(snapshot(store)).toEqual(before);
  return result;
}

describe("checkAttach", () => {
  it("合法挂载", () => {
    const { store, a, c } = setup();
    expect(expectPure(store, () => checkAttach(store, a, c))).toEqual({
      ok: true,
    });
  });

  it("self 自挂 → cycle", () => {
    const { store, a } = setup();
    expect(expectPure(store, () => checkAttach(store, a, a))).toEqual({
      ok: false,
      reason: "cycle",
    });
  });

  it("目标为后代 → cycle", () => {
    const { store, a, t } = setup();
    expect(expectPure(store, () => checkAttach(store, a, t))).toEqual({
      ok: false,
      reason: "cycle",
    });
  });

  it("已挂载同父 → duplicate", () => {
    const { store, a, t } = setup();
    expect(expectPure(store, () => checkAttach(store, t, a))).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });

  it("task 已删 → notFound", () => {
    const { store, a, t } = setup();
    store.deleteEntity(t.id);

    expect(expectPure(store, () => checkAttach(store, t, a))).toEqual({
      ok: false,
      reason: "notFound",
    });
  });

  it("toParent 已删 → notFound", () => {
    const { store, a, b } = setup();
    store.deleteEntity(b.id);

    expect(expectPure(store, () => checkAttach(store, a, b))).toEqual({
      ok: false,
      reason: "notFound",
    });
  });
});

describe("checkDropImpl(kind=move)", () => {
  it("同父 → 恒 ok", () => {
    const { store, a, t } = setup();
    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(a.id, t.id), t, a, "move"),
      ),
    ).toEqual({ ok: true });
  });

  it("异父 → ok", () => {
    const { store, a, b, t } = setup();
    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(a.id, t.id), t, b, "move"),
      ),
    ).toEqual({ ok: true });
  });

  it("异父 → cycle", () => {
    const { store, root, a, t } = setup();
    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(root.id, a.id), a, t, "move"),
      ),
    ).toEqual({ ok: false, reason: "cycle" });
  });

  it("异父 → duplicate", () => {
    const { store, a, b, t } = setup();
    b.attachChild(t);

    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(a.id, t.id), t, b, "move"),
      ),
    ).toEqual({ ok: false, reason: "duplicate" });
  });

  it("move → notFound（源边已亡）", () => {
    const { store, a, b, t } = setup();
    a.detachChild(t);

    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(a.id, t.id), t, b, "move"),
      ),
    ).toEqual({ ok: false, reason: "notFound" });
  });

  it("move → notFound（task/toParent 缺失）", () => {
    const { store, a, b, t } = setup();
    store.deleteEntity(t.id);

    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(a.id, t.id), t, b, "move"),
      ),
    ).toEqual({ ok: false, reason: "notFound" });
  });
});

describe("checkDropImpl(kind=link)", () => {
  it("同父 → duplicate", () => {
    const { store, a, t } = setup();
    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(a.id, t.id), t, a, "link"),
      ),
    ).toEqual({ ok: false, reason: "duplicate" });
  });

  it("自挂 → cycle", () => {
    const { store, a } = setup();
    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf("A", a.id), a, a, "link"),
      ),
    ).toEqual({ ok: false, reason: "cycle" });
  });

  it("后代 → cycle", () => {
    const { store, a, t } = setup();
    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf("A", a.id), a, t, "link"),
      ),
    ).toEqual({ ok: false, reason: "cycle" });
  });

  it("源边已亡仍按 checkAttach 判定（不 notFound）", () => {
    const { store, a, c, t } = setup();
    a.detachChild(t);

    expect(
      expectPure(store, () =>
        checkDropImpl(store, edgeOf(a.id, t.id), t, c, "link"),
      ),
    ).toEqual({ ok: true });
  });
});
