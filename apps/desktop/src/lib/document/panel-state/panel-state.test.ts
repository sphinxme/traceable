import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import {
  createYMapKeysSubscriber,
  createYMapSubscriber,
} from "$lib/document/entities/reactive-yjs";
import {
  addChain,
  addTask,
  foldKeys,
  makeDocumentFixture,
} from "@/tests/fixtures/document";

describe("PanelState.entry", () => {
  it("懒建 entry 且同 panelId 同一底层 Y.Map", () => {
    const { store, panelState } = makeDocumentFixture();
    expect(store.panelStates.has("p")).toBe(false);

    const first = panelState.entry("p");
    const second = panelState.entry("p");

    expect(store.panelStates.has("p")).toBe(true);
    expect(first.yMap).toBe(second.yMap);
    expect(store.panelStates.get("p")).toBe(first.yMap);
  });

  it("panelIds 列出全部键", () => {
    const { panelState } = makeDocumentFixture();
    panelState.entry("p");
    panelState.entry("q");

    expect(panelState.panelIds()).toEqual(["p", "q"]);
  });
});

describe("PanelStateEntry.navPaths", () => {
  it("初始 undefined，set/get 往返", () => {
    const { panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");

    expect(entry.navPaths).toBeUndefined();

    entry.navPaths = ["root", "A"];
    expect(entry.navPaths).toEqual(["root", "A"]);
    expect(entry.yMap.get("nav")).toEqual(["root", "A"]);
  });

  it("set undefined 删键", () => {
    const { panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");
    entry.navPaths = ["root"];

    entry.navPaths = undefined;

    expect(entry.yMap.has("nav")).toBe(false);
    expect(entry.navPaths).toBeUndefined();
  });

  it("get/set 副本隔离", () => {
    const { panelState } = makeDocumentFixture();
    const entry = panelState.entry("p");
    const source = ["root", "A"];

    entry.navPaths = source;
    source.push("B");

    const read = entry.navPaths!;
    read.push("C");

    expect(entry.navPaths).toEqual(["root", "A"]);
  });
});

describe("PanelStateEntry.pruneTask", () => {
  it("多 home 命中、homeId 命中删整棵、其他键保留", () => {
    const { store, panelState, root } = makeDocumentFixture();
    const root2 = addTask(store, undefined, "R2", "root2");
    addChain(store, root, ["A", "B"]);
    addTask(store, root2, "C", "C");

    const entry = panelState.entry("p");
    const first = entry.tree(root.id);
    const second = entry.tree("root2");
    first.setFolded(["A"], true);
    first.setFolded(["B"], true);
    second.setFolded(["A"], true);
    second.setFolded(["C"], true);

    entry.pruneTask("A");

    expect(first.isFolded(["A"])).toBe(false);
    expect(first.isFolded(["B"])).toBe(true);
    expect(second.isFolded(["A"])).toBe(false);
    expect(second.isFolded(["C"])).toBe(true);

    entry.pruneTask("root2");
    expect(entry.homesMap?.has("root2")).toBe(false);
    expect(entry.homesMap?.has(root.id)).toBe(true);
  });
});

describe("PanelState.sweep", () => {
  it("剪除死 home/子键，保留活键、folded 与 nav", () => {
    const { store, panelState, root } = makeDocumentFixture();
    addChain(store, root, ["A", "B"]);

    const entry = panelState.entry("p");
    entry.navPaths = ["root", "A"];
    const tree = entry.tree(root.id);
    tree.setFolded(["A"], true);
    tree.setFolded(["dead"], true);
    entry.tree("deadHome").setFolded([], true);

    panelState.sweep();

    expect(entry.homesMap?.has("deadHome")).toBe(false);
    expect(entry.homesMap?.has(root.id)).toBe(true);
    expect(tree.isFolded(["A"])).toBe(true);
    expect(entry.homesMap!.get(root.id).has("dead")).toBe(false);
    expect(entry.navPaths).toEqual(["root", "A"]);
  });
});

describe("subscriber 缓存", () => {
  it("同 Y.Map 返回同一 subscriber", () => {
    const map = new Y.Map();

    expect(createYMapSubscriber(map)).toBe(createYMapSubscriber(map));
    expect(createYMapKeysSubscriber(map)).toBe(createYMapKeysSubscriber(map));
  });
});

describe("foldKeys fixture", () => {
  it("收集全部折叠树实体键", () => {
    const { store, panelState, root } = makeDocumentFixture();
    addChain(store, root, ["A", "B"]);
    const entry = panelState.entry("p");
    entry.tree(root.id).setFolded(["A", "B"], true);
    entry.tree("home2").setFolded([], true);

    expect(foldKeys(store).sort()).toEqual(["A", "B", "home2", "root"]);
  });
});
