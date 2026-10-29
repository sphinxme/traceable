import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import {
  findAllOccurrencePaths,
  isDescendantOrSelf,
} from "$lib/document/search";
import type { Task } from "$lib/document/entities/task.svelte";
import {
  addChain,
  addTask,
  makeDocumentFixture,
} from "@/tests/fixtures/document";

function pushRawChild(parent: Task, childId: string) {
  const children = parent.yMap.get("children") as Y.Array<string>;
  children.push([childId]);
}

describe("findAllOccurrencePaths", () => {
  it("目标 = root 返回 [[]]", () => {
    const { root } = makeDocumentFixture();
    expect(findAllOccurrencePaths(root, root.id)).toEqual([[]]);
  });

  it("单链返回完整路径", () => {
    const { store, root } = makeDocumentFixture();
    addChain(store, root, ["A", "B", "C"]);

    expect(findAllOccurrencePaths(root, "C")).toEqual([["A", "B", "C"]]);
  });

  it("目标是直接子节点", () => {
    const { store, root } = makeDocumentFixture();
    addTask(store, root, "A", "A");

    expect(findAllOccurrencePaths(root, "A")).toEqual([["A"]]);
  });

  it("多父产生多条路径（DFS 序）", () => {
    const { store, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const t = addTask(store, a, "T", "T");
    b.attachChild(t);

    expect(findAllOccurrencePaths(root, "T")).toEqual([
      ["A", "T"],
      ["B", "T"],
    ]);
  });

  it("菱形子图产出全部简单路径", () => {
    const { store, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, root, "B", "B");
    const c = addTask(store, a, "C", "C");
    b.attachChild(c);
    addTask(store, c, "T", "T");

    expect(findAllOccurrencePaths(root, "T")).toEqual([
      ["A", "C", "T"],
      ["B", "C", "T"],
    ]);
  });

  it("不可达返回 []", () => {
    const { store, root } = makeDocumentFixture();
    addChain(store, root, ["A", "B"]);

    expect(findAllOccurrencePaths(root, "missing")).toEqual([]);
  });

  it("死子 id 被跳过", () => {
    const { store, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    addTask(store, a, "B", "B");
    pushRawChild(root, "dead");

    expect(findAllOccurrencePaths(root, "B")).toEqual([["A", "B"]]);
  });

  it("实体删除后不可达", () => {
    const { store, root } = makeDocumentFixture();
    addChain(store, root, ["A", "B"]);
    store.deleteEntity("B");

    expect(findAllOccurrencePaths(root, "B")).toEqual([]);
  });

  it("环上搜索终止", () => {
    const { store, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, a, "B", "B");
    pushRawChild(b, "A");

    expect(findAllOccurrencePaths(root, "missing")).toEqual([]);
  });
});

describe("isDescendantOrSelf", () => {
  it("self 为真", () => {
    const { root } = makeDocumentFixture();
    expect(isDescendantOrSelf(root, root.id)).toBe(true);
  });

  it("后代为真", () => {
    const { store, root } = makeDocumentFixture();
    addChain(store, root, ["A", "B", "C"]);

    expect(isDescendantOrSelf(root, "C")).toBe(true);
  });

  it("非后代为假", () => {
    const { store, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const other = addTask(store, root, "X", "X");

    expect(isDescendantOrSelf(a, other.id)).toBe(false);
  });

  it("环内判定终止且正确", () => {
    const { store, root } = makeDocumentFixture();
    const a = addTask(store, root, "A", "A");
    const b = addTask(store, a, "B", "B");
    pushRawChild(b, "A");

    expect(isDescendantOrSelf(a, "B")).toBe(true);
    expect(isDescendantOrSelf(a, "missing")).toBe(false);
  });

  it("死子不影响判定", () => {
    const { root } = makeDocumentFixture();
    pushRawChild(root, "dead");
    expect(isDescendantOrSelf(root, "dead")).toBe(false);
  });
});
