import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import type { PanelStateEntry } from "$lib/document/panel-state/panel-state";
import {
  addChain,
  addTask,
  countTransactions,
  makeDocumentFixture,
} from "@/tests/fixtures/document";

function setup() {
  const fixture = makeDocumentFixture();
  addChain(fixture.store, fixture.root, ["A", "B", "C"]);
  return fixture;
}

function rawHomes(entry: PanelStateEntry): Y.Map<any> | undefined {
  return entry.homesMap;
}

describe("FoldTree 读取", () => {
  it("tree() 读取不创建 home 节点", () => {
    const { panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");
    const tree = entry.tree("root");

    expect(tree.isFolded([])).toBe(false);
    expect(entry.homesMap).toBeUndefined();
  });

  it("isFolded 默认 false", () => {
    const { panelState } = setup();
    expect(panelState.entry("p").tree("root").isFolded(["A"])).toBe(false);
  });
});

describe("FoldTree 写入", () => {
  it("setFolded 懒建链并写入 root", () => {
    const { panelState, root } = setup();
    const entry = panelState.entry("p");
    const tree = entry.tree(root.id);

    tree.setFolded(["A", "B"], true);
    expect(tree.isFolded(["A", "B"])).toBe(true);
    expect(tree.isFolded(["A"])).toBe(false);

    tree.setFolded([], true);
    expect(tree.isFolded([])).toBe(true);
  });

  it("unfold 缺失 no-op 且不建节点", () => {
    const { doc, panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");
    const tree = entry.tree("root");

    const count = countTransactions(doc, () => tree.unfold(["A"]));
    expect(count).toBe(0);
    expect(entry.homesMap).toBeUndefined();
  });

  it("unfold 将 folded 置 false", () => {
    const { doc, panelState } = setup();
    const tree = panelState.entry("p").tree("root");
    tree.setFolded(["A"], true);

    const count = countTransactions(doc, () => tree.unfold(["A"]));
    expect(count).toBe(1);
    expect(tree.isFolded(["A"])).toBe(false);
  });

  it("unfold 已展开节点零写入", () => {
    const { doc, panelState } = setup();
    const tree = panelState.entry("p").tree("root");
    tree.setFolded(["A"], false);

    expect(countTransactions(doc, () => tree.unfold(["A"]))).toBe(0);
  });

  it("expandAlong 只展开真前缀", () => {
    const { panelState } = setup();
    const tree = panelState.entry("p").tree("root");
    tree.setFolded(["A"], true);
    tree.setFolded(["A", "B"], true);
    tree.setFolded(["A", "B", "C"], true);

    tree.expandAlong(["A", "B", "C"]);

    expect(tree.isFolded(["A"])).toBe(false);
    expect(tree.isFolded(["A", "B"])).toBe(false);
    expect(tree.isFolded(["A", "B", "C"])).toBe(true);
  });

  it("expandAlong 空/单元素 path 零写入", () => {
    const { doc, panelState } = setup();
    const tree = panelState.entry("p").tree("root");

    expect(countTransactions(doc, () => tree.expandAlong([]))).toBe(0);
    expect(countTransactions(doc, () => tree.expandAlong(["A"]))).toBe(0);
  });
});

describe("FoldTree 迁移与删除", () => {
  it("moveSubtree clone 折叠子树并删源", () => {
    const { store, panelState, root } = setup();
    const root2 = addTask(store, undefined, "R2", "root2");
    addTask(store, root2, "X", "X");

    const entry = panelState.entry("p");
    const fromTree = entry.tree(root.id);
    const toTree = entry.tree("root2");
    fromTree.setFolded(["A"], true);
    fromTree.setFolded(["A", "B"], true);

    fromTree.moveSubtree(["A"], toTree, ["X"]);

    expect(toTree.isFolded(["X"])).toBe(true);
    expect(toTree.isFolded(["X", "B"])).toBe(true);
    expect(fromTree.isFolded(["A"])).toBe(false);
    expect(rawHomes(entry)!.get(root.id).has("A")).toBe(false);
  });

  it("moveSubtree 跨 entry 迁移", () => {
    const { store, panelState, root } = setup();
    const root2 = addTask(store, undefined, "R2", "root2");
    addTask(store, root2, "X", "X");

    const fromTree = panelState.entry("p").tree(root.id);
    const toTree = panelState.entry("q").tree("root2");
    fromTree.setFolded(["A"], true);

    fromTree.moveSubtree(["A"], toTree, ["X"]);

    expect(toTree.isFolded(["X"])).toBe(true);
    expect(fromTree.isFolded(["A"])).toBe(false);
  });

  it("moveSubtree 源缺失时目标零节点", () => {
    const { doc, panelState, root } = setup();
    const entry = panelState.entry("p");
    const fromTree = entry.tree(root.id);
    const toTree = entry.tree("root2");

    const count = countTransactions(doc, () => {
      fromTree.moveSubtree(["missing"], toTree, ["X"]);
    });

    expect(count).toBe(0);
    expect(entry.homesMap).toBeUndefined();
  });

  it("moveSubtree 同树同 path no-op（不依赖对象身份）", () => {
    const { doc, panelState, root } = setup();
    const entry = panelState.entry("p");
    const first = entry.tree(root.id);
    first.setFolded(["A"], true);
    const second = entry.tree(root.id);

    expect(
      countTransactions(doc, () => first.moveSubtree(["A"], second, ["A"])),
    ).toBe(0);
    expect(first.isFolded(["A"])).toBe(true);
  });

  it("deleteSubtree 删除节点与嵌套子树", () => {
    const { panelState, root } = setup();
    const entry = panelState.entry("p");
    const tree = entry.tree(root.id);
    tree.setFolded(["A"], true);
    tree.setFolded(["A", "B"], true);

    tree.deleteSubtree(["A"]);

    expect(tree.isFolded(["A"])).toBe(false);
    expect(rawHomes(entry)!.get(root.id).has("A")).toBe(false);
  });

  it("deleteSubtree 缺失 no-op；空 path 删 home 节点", () => {
    const { doc, panelState } = setup();
    const entry = panelState.entry("p");
    const tree = entry.tree("root");

    expect(countTransactions(doc, () => tree.deleteSubtree(["missing"]))).toBe(
      0,
    );

    tree.setFolded([], true);
    tree.deleteSubtree([]);
    expect(entry.homesMap?.has("root")).toBe(false);
  });
});

describe("isFolded 懒 GC", () => {
  it("死子键被剪除", () => {
    const { panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");
    const tree = entry.tree("root");
    tree.setFolded(["dead"], true);

    expect(tree.isFolded(["dead"])).toBe(false);
    expect(rawHomes(entry)!.get("root").has("dead")).toBe(false);
  });

  it("中间死键被剪除", () => {
    const { panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");
    const tree = entry.tree("root");
    tree.setFolded(["dead", "x"], true);

    expect(tree.isFolded(["dead", "x"])).toBe(false);
    expect(rawHomes(entry)!.get("root").has("dead")).toBe(false);
  });

  it("home 死键被剪除", () => {
    const { panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");
    const tree = entry.tree("ghost");
    tree.setFolded([], true);

    expect(tree.isFolded([])).toBe(false);
    expect(entry.homesMap?.has("ghost")).toBe(false);
  });
});
