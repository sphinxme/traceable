import { describe, expect, it, vi } from "vitest";
import { findAllOccurrencePaths } from "$lib/document/search";
import { checkDropImpl } from "$lib/outline-ops/check";
import type { Store } from "$lib/document/entities/store.svelte";
import type { OpResult } from "$lib/protocol";
import type { PanelState } from "$lib/document/panel-state/panel-state";
import {
  addTask,
  countTransactions,
  edge,
  foldKeys,
  makeDocumentFixture,
  ref,
  snapshot,
} from "@/tests/fixtures/document";

function expectFailure(store: Store, fn: () => OpResult) {
  const before = snapshot(store);
  let result: OpResult | undefined;
  const count = countTransactions(store.doc, () => {
    result = fn();
  });

  expect(count).toBe(0);
  expect(snapshot(store)).toEqual(before);
  expect(result!.ok).toBe(false);
  return result as { ok: false; reason: string };
}

function expectSuccess(store: Store, fn: () => OpResult) {
  let result: OpResult | undefined;
  const count = countTransactions(store.doc, () => {
    result = fn();
  });

  expect(count).toBe(1);
  expect(result!.ok).toBe(true);
  return (result as { ok: true; change: any }).change;
}

function tree(panelState: PanelState, panelId: string, homeId: string) {
  return panelState.entry(panelId).tree(homeId);
}

describe("insert", () => {
  it("首位/中间/末位与越界收敛", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const c = addTask(store, root, "C", "C");

    ops.insert(root, 1, "M", "M", { to: ref("p", "root", ["M"]) });
    expect(root.children.toIds()).toEqual(["A", "M", "C"]);

    ops.insert(root, -5, "F", "F", { to: ref("p", "root", ["F"]) });
    ops.insert(root, 99, "L", "L", { to: ref("p", "root", ["L"]) });

    expect(root.children.toIds()).toEqual(["F", "A", "M", "C", "L"]);
    expect(a.children.toIds()).toEqual([]);
    expect(c.children.toIds()).toEqual([]);
  });

  it("text=undefined 初始化为空串，descriptor 回读 toIndex", () => {
    const { store, ops, root } = makeDocumentFixture();
    addTask(store, root, "A", "A");

    const change = expectSuccess(store, () =>
      ops.insert(root, 1, undefined, "N", { to: ref("p", "root", ["N"]) }),
    );

    expect(store.getTask("N")!.$text).toBe("");
    expect(change).toEqual({
      op: "inserted",
      taskId: "N",
      parentTaskId: root.id,
      toIndex: 1,
    });
  });

  it("预生成 id 生效", () => {
    const { store, ops, root } = makeDocumentFixture();
    const id = ops.newTaskId();

    ops.insert(root, 0, "x", id, { to: ref("p", "root", [id]) });

    expect(store.getTask(id)?.$text).toBe("x");
  });

  it("invalid ref / 父缺失 / id 占用 失败零写入", () => {
    const { store, ops, root } = makeDocumentFixture();

    expect(
      expectFailure(store, () =>
        ops.insert(root, 0, "x", "N", {
          to: ref("", "root", ["N"]),
        }),
      ).reason,
    ).toBe("invalid");

    const missing = addTask(store, undefined, "missing", "missing");
    store.deleteEntity(missing.id);
    expect(
      expectFailure(store, () =>
        ops.insert(missing, 0, "x", "N", { to: ref("p", "root", ["N"]) }),
      ).reason,
    ).toBe("notFound");

    addTask(store, root, "dup", "dup");
    expect(
      expectFailure(store, () =>
        ops.insert(root, 0, "x", "dup", { to: ref("p", "root", ["dup"]) }),
      ).reason,
    ).toBe("invalid");
  });

  it("展开落点父，且数据与折叠同事务可见", () => {
    const { doc, store, panelState, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const foldTree = tree(panelState, "p", "root");
    foldTree.setFolded(["A"], true);

    let observed: { folded: boolean; children: string[] } | undefined;
    const handler = () => {
      observed = {
        folded: foldTree.isFolded(["A"]),
        children: a.children.toIds(),
      };
    };
    doc.on("afterTransaction", handler);

    ops.insert(a, 0, "N", "N", { to: ref("p", "root", ["A", "N"]) });

    doc.off("afterTransaction", handler);
    expect(observed).toEqual({ folded: false, children: ["N"] });
  });

  it("多父：parent 的所有出现同步获得新子", () => {
    const { store, ops, root } = makeDocumentFixture();
    const root2 = addTask(store, undefined, "R2", "root2");
    const a = addTask(store, root, "A", "A");
    root2.attachChild(a);

    ops.insert(a, 0, "N", "N", { to: ref("p", "root", ["A", "N"]) });

    expect(findAllOccurrencePaths(root, "N")).toEqual([["A", "N"]]);
    expect(findAllOccurrencePaths(root2, "N")).toEqual([["A", "N"]]);
  });
});

describe("split", () => {
  function setupSplit() {
    const fixture = makeDocumentFixture();
    const { store, root } = fixture;
    const p = addTask(store, root, "P", "P");
    const t = addTask(store, p, "hello", "T");
    return { ...fixture, p, t };
  }

  it("cursor 0 / 中间 / 末尾", () => {
    const first = setupSplit();
    first.ops.split(edge(first.p, first.t), 0, "N", {
      to: ref("p", "root", ["P", "N"]),
    });
    expect(first.p.children.toIds()).toEqual(["N", "T"]);
    expect(first.store.getTask("N")!.$text).toBe("");
    expect(first.t.$text).toBe("hello");

    const middle = setupSplit();
    middle.ops.split(edge(middle.p, middle.t), 2, "N", {
      to: ref("p", "root", ["P", "N"]),
    });
    expect(middle.store.getTask("N")!.$text).toBe("he");
    expect(middle.t.$text).toBe("llo");

    const end = setupSplit();
    end.ops.split(edge(end.p, end.t), 5, "N", {
      to: ref("p", "root", ["P", "N"]),
    });
    expect(end.store.getTask("N")!.$text).toBe("hello");
    expect(end.t.$text).toBe("");
  });

  it("descriptor 与单事务", () => {
    const { store, ops, root } = setupSplit();
    const p = store.getTask("P")!;
    const t = store.getTask("T")!;

    const change = expectSuccess(store, () =>
      ops.split(edge(p, t), 2, "N", { to: ref("p", "root", ["P", "N"]) }),
    );

    expect(change).toEqual({
      op: "split",
      fromTaskId: "T",
      newTaskId: "N",
      parentTaskId: "P",
      toIndex: 0,
    });
  });

  it("cursor 非整数/负/超长、id 占用失败零写入", () => {
    const { store, ops, p, t } = setupSplit();
    const target = { to: ref("p", "root", ["P", "N"]) };

    expect(
      expectFailure(store, () => ops.split(edge(p, t), 1.5, "N", target))
        .reason,
    ).toBe("invalid");
    expect(
      expectFailure(store, () => ops.split(edge(p, t), -1, "N", target)).reason,
    ).toBe("invalid");
    expect(
      expectFailure(store, () => ops.split(edge(p, t), 6, "N", target)).reason,
    ).toBe("invalid");
    expect(
      expectFailure(store, () => ops.split(edge(p, t), 2, "T", target)).reason,
    ).toBe("invalid");
  });

  it("边缺失 → notFound", () => {
    const { store, ops, p, t } = setupSplit();
    p.detachChild(t);

    expect(
      expectFailure(store, () =>
        ops.split(edge(p, t), 2, "N", { to: ref("p", "root", ["P", "N"]) }),
      ).reason,
    ).toBe("notFound");
  });

  it("多父：标题截断同步到所有出现", () => {
    const { store, ops, root, p, t } = setupSplit();
    const q = addTask(store, root, "Q", "Q");
    q.attachChild(t);

    ops.split(edge(p, t), 2, "N", { to: ref("p", "root", ["P", "N"]) });

    expect(t.$text).toBe("llo");
    expect(q.children.toIds()).toEqual(["T"]);
  });
});

describe("indent", () => {
  function setupIndent() {
    const fixture = makeDocumentFixture();
    const { store, root } = fixture;
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const c = addTask(store, b, "C", "C");
    return { ...fixture, a, b, c };
  }

  it("成为 prev 末子并迁移折叠、展开 prev", () => {
    const { store, panelState, ops, root, a, b } = setupIndent();
    const foldTree = tree(panelState, "p", "root");
    foldTree.setFolded(["A"], true);
    foldTree.setFolded(["B"], true);
    foldTree.setFolded(["B", "C"], true);

    const change = expectSuccess(store, () =>
      ops.indent(edge(root, b), {
        from: ref("p", "root", ["B"]),
        to: ref("p", "root", ["A", "B"]),
      }),
    );

    expect(root.children.toIds()).toEqual(["A"]);
    expect(a.children.toIds()).toEqual(["B"]);
    expect(change).toEqual({
      op: "moved",
      taskId: "B",
      fromParentTaskId: "root",
      toParentTaskId: "A",
      toIndex: 0,
      kind: "reparent",
    });
    expect(foldTree.isFolded(["A"])).toBe(false);
    expect(foldTree.isFolded(["A", "B"])).toBe(true);
    expect(foldTree.isFolded(["A", "B", "C"])).toBe(true);
    expect(foldTree.isFolded(["B"])).toBe(false);
  });

  it("cycle / duplicate / notFound 失败零写入", () => {
    const cycleFixture = makeDocumentFixture();
    const cycleStore = cycleFixture.store;
    const a = addTask(cycleStore, cycleFixture.root, "A", "A");
    const b = addTask(cycleStore, a, "B", "B");

    expect(
      expectFailure(cycleStore, () =>
        cycleFixture.ops.indent(edge(cycleFixture.root, a), {
          from: ref("p", "root", ["A"]),
          to: ref("p", "root", ["B", "A"]),
        }),
      ).reason,
    ).toBe("cycle");

    const dupFixture = makeDocumentFixture();
    const dupStore = dupFixture.store;
    const da = addTask(dupStore, dupFixture.root, "A", "A");
    const db = addTask(dupStore, da, "B", "B");
    dupFixture.root.attachChild(db);

    expect(
      expectFailure(dupStore, () =>
        dupFixture.ops.indent(edge(dupFixture.root, db), {
          from: ref("p", "root", ["B"]),
          to: ref("p", "root", ["A", "B"]),
        }),
      ).reason,
    ).toBe("duplicate");

    const missFixture = makeDocumentFixture();
    const missStore = missFixture.store;
    const ma = addTask(missStore, missFixture.root, "A", "A");
    const mb = addTask(missStore, missFixture.root, "B", "B");
    missStore.deleteEntity(ma.id);

    expect(
      expectFailure(missStore, () =>
        missFixture.ops.indent(edge(missFixture.root, mb), {
          from: ref("p", "root", ["B"]),
          to: ref("p", "root", ["A", "B"]),
        }),
      ).reason,
    ).toBe("notFound");
  });

  it("多父：只改 edge 这一条边", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const c = addTask(store, root, "C", "C");
    const t = addTask(store, a, "T", "T");
    b.attachChild(t);

    ops.indent(edge(a, t), {
      from: ref("p", "root", ["A", "T"]),
      to: ref("p", "root", ["C", "T"]),
    });

    expect(a.children.toIds()).toEqual([]);
    expect(b.children.toIds()).toEqual(["T"]);
    expect(c.children.toIds()).toEqual(["T"]);
    expect(t.parents.toIds().sort()).toEqual(["B", "C"]);
  });
});

describe("outdent", () => {
  it("成为父的后一兄弟，descriptor 与单事务", () => {
    const { store, ops, root } = makeDocumentFixture();
    const p = addTask(store, root, "P", "P");
    const x = addTask(store, root, "X", "X");
    const t = addTask(store, p, "T", "T");

    const change = expectSuccess(store, () =>
      ops.outdent(edge(p, t), {
        from: ref("p", "root", ["P", "T"]),
        to: ref("p", "root", ["T"]),
      }),
    );

    expect(root.children.toIds()).toEqual(["P", "T", "X"]);
    expect(x.children.toIds()).toEqual([]);
    expect(change).toEqual({
      op: "moved",
      taskId: "T",
      fromParentTaskId: "P",
      toParentTaskId: "root",
      toIndex: 1,
      kind: "reparent",
    });
  });

  it("P 失锚 → toIndex 收敛 0", () => {
    const { store, ops, root } = makeDocumentFixture();
    const p = addTask(store, undefined, "P", "P");
    const t = addTask(store, p, "T", "T");
    const x = addTask(store, root, "X", "X");

    const change = ops.outdent(edge(p, t), {
      from: ref("p", "root", ["P", "T"]),
      to: ref("p", "root", ["T"]),
    });

    expect(root.children.toIds()).toEqual(["T", "X"]);
    expect(change).toMatchObject({ ok: true, change: { toIndex: 0 } });
  });

  it("迁移折叠并展开 G", () => {
    const { store, panelState, ops, root } = makeDocumentFixture();
    const p = addTask(store, root, "P", "P");
    const t = addTask(store, p, "T", "T");
    addTask(store, t, "C", "C");
    const foldTree = tree(panelState, "p", "root");
    foldTree.setFolded([], true);
    foldTree.setFolded(["P"], true);
    foldTree.setFolded(["P", "T"], true);
    foldTree.setFolded(["P", "T", "C"], true);

    ops.outdent(edge(p, t), {
      from: ref("p", "root", ["P", "T"]),
      to: ref("p", "root", ["T"]),
    });

    expect(foldTree.isFolded([])).toBe(false);
    expect(foldTree.isFolded(["T"])).toBe(true);
    expect(foldTree.isFolded(["T", "C"])).toBe(true);
  });

  it("cycle / duplicate / notFound 失败零写入", () => {
    const cycleFixture = makeDocumentFixture();
    const cp = addTask(cycleFixture.store, cycleFixture.root, "P", "P");
    const ct = addTask(cycleFixture.store, cp, "T", "T");

    expect(
      expectFailure(cycleFixture.store, () =>
        cycleFixture.ops.outdent(edge(cp, ct), {
          from: ref("p", "root", ["P", "T"]),
          to: ref("p", "root", ["T", "T"]),
        }),
      ).reason,
    ).toBe("cycle");

    const dupFixture = makeDocumentFixture();
    const dp = addTask(dupFixture.store, dupFixture.root, "P", "P");
    const dq = addTask(dupFixture.store, dupFixture.root, "Q", "Q");
    const dt = addTask(dupFixture.store, dp, "T", "T");
    dq.attachChild(dt);

    expect(
      expectFailure(dupFixture.store, () =>
        dupFixture.ops.outdent(edge(dp, dt), {
          from: ref("p", "root", ["P", "T"]),
          to: ref("p", "root", ["Q", "T"]),
        }),
      ).reason,
    ).toBe("duplicate");

    const missFixture = makeDocumentFixture();
    const mp = addTask(missFixture.store, missFixture.root, "P", "P");
    const mt = addTask(missFixture.store, mp, "T", "T");
    mp.detachChild(mt);

    expect(
      expectFailure(missFixture.store, () =>
        missFixture.ops.outdent(edge(mp, mt), {
          from: ref("p", "root", ["P", "T"]),
          to: ref("p", "root", ["T"]),
        }),
      ).reason,
    ).toBe("notFound");
  });

  it("多父：其他父边保持不变", () => {
    const { store, ops, root } = makeDocumentFixture();
    const p = addTask(store, root, "P", "P");
    const q = addTask(store, root, "Q", "Q");
    const t = addTask(store, p, "T", "T");
    q.attachChild(t);

    ops.outdent(edge(p, t), {
      from: ref("p", "root", ["P", "T"]),
      to: ref("p", "root", ["T"]),
    });

    expect(p.children.toIds()).toEqual([]);
    expect(q.children.toIds()).toEqual(["T"]);
    expect(root.children.toIds()).toEqual(["P", "T", "Q"]);
    expect(t.parents.toIds().sort()).toEqual(["Q", "root"]);
  });
});

describe("move(reorder)", () => {
  function setupReorder() {
    const fixture = makeDocumentFixture();
    const { store, root } = fixture;
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const c = addTask(store, root, "C", "C");
    return { ...fixture, a, b, c };
  }

  it("slot 终位与 descriptor 实际 toIndex", () => {
    const { store, ops, root, c } = setupReorder();

    const change = expectSuccess(store, () =>
      ops.move(edge(root, c), root, 0, "reorder", {
        from: ref("p", "root", ["C"]),
        to: ref("p", "root", ["C"]),
      }),
    );

    expect(root.children.toIds()).toEqual(["C", "A", "B"]);
    expect(change).toMatchObject({ op: "moved", kind: "reorder", toIndex: 0 });
  });

  it("先删后插换算：A 放到槽位 2 落在 index 1", () => {
    const { store, ops, root, a } = setupReorder();

    const change = ops.move(edge(root, a), root, 2, "reorder", {
      from: ref("p", "root", ["A"]),
      to: ref("p", "root", ["A"]),
    });

    expect(root.children.toIds()).toEqual(["B", "A", "C"]);
    expect(change).toMatchObject({ ok: true, change: { toIndex: 1 } });
  });

  it("same-spot（cur / cur+1）no-op", () => {
    const { store, ops, root, a } = setupReorder();

    ops.move(edge(root, a), root, 0, "reorder", {
      from: ref("p", "root", ["A"]),
      to: ref("p", "root", ["A"]),
    });
    expect(root.children.toIds()).toEqual(["A", "B", "C"]);

    ops.move(edge(root, a), root, 1, "reorder", {
      from: ref("p", "root", ["A"]),
      to: ref("p", "root", ["A"]),
    });
    expect(root.children.toIds()).toEqual(["A", "B", "C"]);
  });

  it("越界收敛", () => {
    const { store, ops, root, a } = setupReorder();

    ops.move(edge(root, a), root, 99, "reorder", {
      from: ref("p", "root", ["A"]),
      to: ref("p", "root", ["A"]),
    });
    expect(root.children.toIds()).toEqual(["B", "C", "A"]);

    ops.move(edge(root, a), root, -10, "reorder", {
      from: ref("p", "root", ["A"]),
      to: ref("p", "root", ["A"]),
    });
    expect(root.children.toIds()).toEqual(["A", "B", "C"]);
  });

  it("无折叠写入", () => {
    const { store, panelState, ops, root, a, c } = setupReorder();
    const foldTree = tree(panelState, "p", "root");
    foldTree.setFolded(["A"], true);
    foldTree.setFolded(["C"], true);

    ops.move(edge(root, c), root, 0, "reorder", {
      from: ref("p", "root", ["C"]),
      to: ref("p", "root", ["C"]),
    });

    expect(foldTree.isFolded(["A"])).toBe(true);
    expect(foldTree.isFolded(["C"])).toBe(true);
    expect(a.children.toIds()).toEqual([]);
  });
});

describe("move(reparent)", () => {
  it("异父边改写、descriptor 与单事务", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const t = addTask(store, a, "T", "T");

    const change = expectSuccess(store, () =>
      ops.move(edge(a, t), b, 0, "reparent", {
        from: ref("p", "root", ["A", "T"]),
        to: ref("p", "root", ["B", "T"]),
      }),
    );

    expect(a.children.toIds()).toEqual([]);
    expect(b.children.toIds()).toEqual(["T"]);
    expect(change).toEqual({
      op: "moved",
      taskId: "T",
      fromParentTaskId: "A",
      toParentTaskId: "B",
      toIndex: 0,
      kind: "reparent",
    });
  });

  it("跨 panel/home 迁移折叠并展开目标父", () => {
    const { store, panelState, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const t = addTask(store, a, "T", "T");
    const root2 = addTask(store, undefined, "R2", "root2");
    const b = addTask(store, root2, "B", "B");

    const fromTree = tree(panelState, "p", "root");
    const toTree = tree(panelState, "q", "root2");
    fromTree.setFolded(["A", "T"], true);
    toTree.setFolded(["B"], true);

    ops.move(edge(a, t), b, 0, "reparent", {
      from: ref("p", "root", ["A", "T"]),
      to: ref("q", "root2", ["B", "T"]),
    });

    expect(fromTree.isFolded(["A", "T"])).toBe(false);
    expect(toTree.isFolded(["B"])).toBe(false);
    expect(toTree.isFolded(["B", "T"])).toBe(true);
  });

  it("cycle / duplicate / notFound 失败零写入", () => {
    const cycleFixture = makeDocumentFixture();
    const a = addTask(cycleFixture.store, cycleFixture.root, "A", "A");
    const t = addTask(cycleFixture.store, a, "T", "T");

    expect(
      expectFailure(cycleFixture.store, () =>
        cycleFixture.ops.move(edge(cycleFixture.root, a), t, 0, "reparent", {
          from: ref("p", "root", ["A"]),
          to: ref("p", "root", ["T", "A"]),
        }),
      ).reason,
    ).toBe("cycle");

    const dupFixture = makeDocumentFixture();
    const da = addTask(dupFixture.store, dupFixture.root, "A", "A");
    const db = addTask(dupFixture.store, dupFixture.root, "B", "B");
    const dt = addTask(dupFixture.store, da, "T", "T");
    db.attachChild(dt);

    expect(
      expectFailure(dupFixture.store, () =>
        dupFixture.ops.move(edge(da, dt), db, 0, "reparent", {
          from: ref("p", "root", ["A", "T"]),
          to: ref("p", "root", ["B", "T"]),
        }),
      ).reason,
    ).toBe("duplicate");

    const missFixture = makeDocumentFixture();
    const ma = addTask(missFixture.store, missFixture.root, "A", "A");
    const mt = addTask(missFixture.store, ma, "T", "T");
    ma.detachChild(mt);

    expect(
      expectFailure(missFixture.store, () =>
        missFixture.ops.move(edge(ma, mt), ma, 0, "reparent", {
          from: ref("p", "root", ["A", "T"]),
          to: ref("p", "root", ["A", "T"]),
        }),
      ).reason,
    ).toBe("notFound");
  });

  it("多父：其他父边与出现保持不变", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const c = addTask(store, root, "C", "C");
    const t = addTask(store, a, "T", "T");
    b.attachChild(t);

    ops.move(edge(a, t), c, 0, "reparent", {
      from: ref("p", "root", ["A", "T"]),
      to: ref("p", "root", ["C", "T"]),
    });

    expect(a.children.toIds()).toEqual([]);
    expect(b.children.toIds()).toEqual(["T"]);
    expect(c.children.toIds()).toEqual(["T"]);
    expect(t.parents.toIds().sort()).toEqual(["B", "C"]);
  });

  it("kind 与数据关系不一致不阻断，描述符报告实际路径", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const t = addTask(store, a, "T", "T");

    const sameParent = ops.move(edge(a, t), a, 0, "reparent", {
      from: ref("p", "root", ["A", "T"]),
      to: ref("p", "root", ["A", "T"]),
    });
    const diffParent = ops.move(edge(a, t), b, 0, "reorder", {
      from: ref("p", "root", ["A", "T"]),
      to: ref("p", "root", ["B", "T"]),
    });

    expect(sameParent).toMatchObject({ ok: true, change: { kind: "reorder" } });
    expect(diffParent).toMatchObject({
      ok: true,
      change: { kind: "reparent", toParentTaskId: "B" },
    });
    spy.mockRestore();
  });
});

function setupLink() {
  const fixture = makeDocumentFixture();
  const { store, root } = fixture;
  const a = addTask(store, root, "A", "A");
  const b = addTask(store, root, "B", "B");
  const t = addTask(store, a, "T", "T");
  return { ...fixture, a, b, t };
}

function expectNoDeadReferences(store: Store) {
  for (const task of store.allTasks) {
    for (const childId of task.children.toIds()) {
      expect(store.tasks.has(childId)).toBe(true);
    }
    for (const parentId of task.parents.toIds()) {
      expect(store.tasks.has(parentId)).toBe(true);
    }
  }
}

describe("link", () => {
  it("加边、源出现保留、新出现无折叠节点、单事务", () => {
    const { store, panelState, ops, a, b, t } = setupLink();

    const change = expectSuccess(store, () =>
      ops.link(t, b, 0, { to: ref("p", "root", ["B", "T"]) }),
    );

    expect(a.children.toIds()).toEqual(["T"]);
    expect(b.children.toIds()).toEqual(["T"]);
    expect(t.parents.toIds().sort()).toEqual(["A", "B"]);
    expect(change).toEqual({ op: "linked", taskId: "T", parentTaskId: "B" });
    expect(panelState.entry("p").homesMap).toBeUndefined();
  });

  it("toIndex 生效与越界收敛", () => {
    const { store, ops, b, t } = setupLink();
    addTask(store, b, "X", "X");
    addTask(store, b, "Y", "Y");

    ops.link(t, b, 99, { to: ref("p", "root", ["B", "T"]) });

    expect(b.children.toIds()).toEqual(["X", "Y", "T"]);
  });

  it("展开目标父", () => {
    const { store, panelState, ops, b, t } = setupLink();
    const foldTree = tree(panelState, "p", "root");
    foldTree.setFolded(["B"], true);

    ops.link(t, b, 0, { to: ref("p", "root", ["B", "T"]) });

    expect(foldTree.isFolded(["B"])).toBe(false);
  });

  it("duplicate / cycle / notFound 失败零写入", () => {
    const dup = setupLink();
    dup.b.attachChild(dup.t);
    expect(
      expectFailure(dup.store, () =>
        dup.ops.link(dup.t, dup.b, 0, { to: ref("p", "root", ["B", "T"]) }),
      ).reason,
    ).toBe("duplicate");

    const self = setupLink();
    expect(
      expectFailure(self.store, () =>
        self.ops.link(self.a, self.a, 0, { to: ref("p", "root", ["A", "A"]) }),
      ).reason,
    ).toBe("cycle");

    const descendant = setupLink();
    expect(
      expectFailure(descendant.store, () =>
        descendant.ops.link(descendant.a, descendant.t, 0, {
          to: ref("p", "root", ["T", "A"]),
        }),
      ).reason,
    ).toBe("cycle");

    const missing = setupLink();
    missing.store.deleteEntity(missing.t.id);
    expect(
      expectFailure(missing.store, () =>
        missing.ops.link(missing.t, missing.b, 0, {
          to: ref("p", "root", ["B", "T"]),
        }),
      ).reason,
    ).toBe("notFound");
  });

  it("多父：源边与其他出现不变", () => {
    const { store, ops, root, a, b, t } = setupLink();
    const c = addTask(store, root, "C", "C");
    c.attachChild(t);

    ops.link(t, b, 0, { to: ref("p", "root", ["B", "T"]) });

    expect(a.children.toIds()).toEqual(["T"]);
    expect(c.children.toIds()).toEqual(["T"]);
    expect(b.children.toIds()).toEqual(["T"]);
    expect(t.parents.toIds().sort()).toEqual(["A", "B", "C"]);
  });
});

describe("unlink", () => {
  it("非末边：仅删该边，from 折叠子树删除，其他出现折叠态保留", () => {
    const { store, panelState, ops, a, b, t } = setupLink();
    b.attachChild(t);
    const foldTree = tree(panelState, "p", "root");
    foldTree.setFolded(["A", "T"], true);
    foldTree.setFolded(["B", "T"], true);

    const change = expectSuccess(store, () =>
      ops.unlink(edge(a, t), { from: ref("p", "root", ["A", "T"]) }),
    );

    expect(a.children.toIds()).toEqual([]);
    expect(b.children.toIds()).toEqual(["T"]);
    expect(store.getTask("T")).toBeDefined();
    expect(change).toEqual({ op: "unlinked", taskId: "T", parentTaskId: "A" });
    expect(foldTree.isFolded(["A", "T"])).toBe(false);
    expect(foldTree.isFolded(["B", "T"])).toBe(true);
  });

  it("末边转级联，全 panel prune", () => {
    const { store, panelState, ops, a, t } = setupLink();
    addTask(store, t, "C", "C");
    panelState.entry("p").tree("root").setFolded(["A", "T"], true);
    panelState.entry("q").tree("root").setFolded(["T"], true);
    panelState.entry("q").tree("root").setFolded(["C"], true);

    const change = expectSuccess(store, () =>
      ops.unlink(edge(a, t), { from: ref("p", "root", ["A", "T"]) }),
    );

    expect(change).toEqual({
      op: "removed",
      taskId: "T",
      fromParentTaskId: "A",
      cascaded: true,
    });
    expect(store.getTask("T")).toBeUndefined();
    expect(store.getTask("C")).toBeUndefined();
    expect(a.children.toIds()).toEqual([]);
    expect(foldKeys(store)).not.toContain("T");
    expect(foldKeys(store)).not.toContain("C");
  });

  it("边缺失 / ref 非法失败零写入", () => {
    const { store, ops, a, t } = setupLink();
    a.detachChild(t);
    expect(
      expectFailure(store, () =>
        ops.unlink(edge(a, t), { from: ref("p", "root", ["A", "T"]) }),
      ).reason,
    ).toBe("notFound");
    expect(
      expectFailure(store, () =>
        ops.unlink(edge(a, t), { from: ref("", "root", ["A", "T"]) }),
      ).reason,
    ).toBe("invalid");
  });
});

describe("remove", () => {
  it("非末边 cascaded=false，T 存活", () => {
    const { store, panelState, ops, a, b, t } = setupLink();
    b.attachChild(t);
    const foldTree = tree(panelState, "p", "root");
    foldTree.setFolded(["A", "T"], true);
    foldTree.setFolded(["B", "T"], true);

    const change = expectSuccess(store, () =>
      ops.remove(edge(a, t), { from: ref("p", "root", ["A", "T"]) }),
    );

    expect(change).toEqual({
      op: "removed",
      taskId: "T",
      fromParentTaskId: "A",
      cascaded: false,
    });
    expect(store.getTask("T")).toBeDefined();
    expect(b.children.toIds()).toEqual(["T"]);
    expect(foldTree.isFolded(["B", "T"])).toBe(true);
  });

  it("末边 cascaded=true，实体删除", () => {
    const { store, ops, a, t } = setupLink();

    const change = expectSuccess(store, () =>
      ops.remove(edge(a, t), { from: ref("p", "root", ["A", "T"]) }),
    );

    expect(change).toMatchObject({ op: "removed", cascaded: true });
    expect(store.getTask("T")).toBeUndefined();
    expect(a.children.toIds()).toEqual([]);
  });

  it("级联闭包：链式传播", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, a, "B", "B");
    addTask(store, b, "C", "C");

    const change = ops.remove(edge(a, b), {
      from: ref("p", "root", ["A", "B"]),
    });

    expect(change).toMatchObject({ ok: true, change: { cascaded: true } });
    expect(store.getTask("B")).toBeUndefined();
    expect(store.getTask("C")).toBeUndefined();
    expect(a.children.toIds()).toEqual([]);
  });

  it("级联闭包：B 另有父 D 时存活，删 D 边后级联", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const d = addTask(store, root, "D", "D");
    const b = addTask(store, a, "B", "B");
    d.attachChild(b);
    addTask(store, b, "C", "C");

    const first = ops.remove(edge(a, b), {
      from: ref("p", "root", ["A", "B"]),
    });
    expect(first).toMatchObject({ ok: true, change: { cascaded: false } });
    expect(store.getTask("B")).toBeDefined();
    expect(store.getTask("C")).toBeDefined();

    const second = ops.remove(edge(d, b), {
      from: ref("p", "root", ["D", "B"]),
    });
    expect(second).toMatchObject({ ok: true, change: { cascaded: true } });
    expect(store.getTask("B")).toBeUndefined();
    expect(store.getTask("C")).toBeUndefined();
  });

  it("级联闭包：C 另有父 E 时存活", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, a, "B", "B");
    const c = addTask(store, b, "C", "C");
    const e = addTask(store, root, "E", "E");
    e.attachChild(c);

    ops.remove(edge(a, b), { from: ref("p", "root", ["A", "B"]) });

    expect(store.getTask("B")).toBeUndefined();
    expect(store.getTask("C")).toBeDefined();
    expect(c.parents.toIds()).toEqual(["E"]);
    expect(e.children.toIds()).toEqual(["C"]);
  });

  it("G10：删除后无死引用、无孤儿折叠键", () => {
    const { store, panelState, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, a, "B", "B");
    addTask(store, b, "C", "C");
    panelState.entry("p").tree("root").setFolded(["A", "B"], true);
    panelState.entry("q").tree("root").setFolded(["C"], true);

    ops.remove(edge(a, b), { from: ref("p", "root", ["A", "B"]) });

    expectNoDeadReferences(store);
    expect(foldKeys(store)).not.toContain("B");
    expect(foldKeys(store)).not.toContain("C");
  });

  it("每个实体至多删除一次", () => {
    const { store, ops, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, a, "B", "B");
    addTask(store, b, "C", "C");
    const spy = vi.spyOn(store, "deleteEntity");

    ops.remove(edge(a, b), { from: ref("p", "root", ["A", "B"]) });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls.map(([taskId]) => taskId).sort()).toEqual(["B", "C"]);
    spy.mockRestore();
  });
});

describe("导出工具", () => {
  it("newTaskId 唯一", () => {
    const { ops } = makeDocumentFixture();
    const first = ops.newTaskId();
    const second = ops.newTaskId();
    expect(first).not.toBe(second);
  });

  it("checkDrop 与 checkDropImpl 结果一致", () => {
    const { store, ops, a, b, t } = setupLink();
    const source = edge(a, t);

    expect(ops.checkDrop(source, t, b, "move")).toEqual(
      checkDropImpl(store, source, t, b, "move"),
    );
    expect(ops.checkDrop(source, t, a, "link")).toEqual(
      checkDropImpl(store, source, t, a, "link"),
    );
  });
});
