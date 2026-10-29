import { describe, expect, it, vi } from "vitest";
import type { Task } from "$lib/document/entities/task.svelte";
import { ViewHandle } from "$lib/view/view-handle.svelte";
import type { FakePanel } from "@/tests/fixtures/view";
import { makeViewFixture } from "@/tests/fixtures/view";
import { addChain, addTask } from "@/tests/fixtures/document";

function mount(panel: FakePanel, task: Task, parent?: ViewHandle): ViewHandle {
  const handle = new ViewHandle(panel, task, parent);
  panel.registry.register(handle);
  return handle;
}

function setupTree() {
  const fixture = makeViewFixture();
  const a = addTask(fixture.store, fixture.root, "A", "a");
  const a1 = addTask(fixture.store, a, "A1", "a1");
  const b = addTask(fixture.store, fixture.root, "B", "b");

  const rootHandle = mount(fixture.panel, fixture.root);
  const aHandle = mount(fixture.panel, a, rootHandle);
  const a1Handle = mount(fixture.panel, a1, aHandle);
  const bHandle = mount(fixture.panel, b, rootHandle);

  return { ...fixture, a, a1, b, rootHandle, aHandle, a1Handle, bHandle };
}

describe("ViewHandle 地址", () => {
  it("root：path = []，ref 指向 home 自身", () => {
    const { rootHandle } = setupTree();
    expect(rootHandle.path()).toEqual([]);
    expect(rootHandle.ref()).toEqual({
      panelId: "panel",
      homeId: "root",
      path: [],
    });
    expect(rootHandle.homeId).toBe("root");
    expect(rootHandle.homeHandle).toBe(rootHandle);
  });

  it("嵌套条目实例：path 不含 home、含目标", () => {
    const { a1Handle } = setupTree();
    expect(a1Handle.path()).toEqual(["a", "a1"]);
    expect(a1Handle.ref()).toEqual({
      panelId: "panel",
      homeId: "root",
      path: ["a", "a1"],
    });
    expect(a1Handle.homeId).toBe("root");
  });

  it("多父双出现：同一任务的两个条目实例 path 不同", () => {
    const fixture = makeViewFixture();
    const a = addTask(fixture.store, fixture.root, "A", "a");
    const b = addTask(fixture.store, fixture.root, "B", "b");
    const shared = addTask(fixture.store, a, "M", "m");
    b.attachChild(shared);

    const rootHandle = mount(fixture.panel, fixture.root);
    const aHandle = mount(fixture.panel, a, rootHandle);
    const bHandle = mount(fixture.panel, b, rootHandle);
    const viaA = mount(fixture.panel, shared, aHandle);
    const viaB = mount(fixture.panel, shared, bHandle);

    expect(viaA.path()).toEqual(["a", "m"]);
    expect(viaB.path()).toEqual(["b", "m"]);
    expect(viaA.hid).not.toBe(viaB.hid);
  });

  it("ref() 每次调用返回新对象（不缓存）", () => {
    const { aHandle } = setupTree();
    const first = aHandle.ref();
    const second = aHandle.ref();
    expect(first).not.toBe(second);
    expect(first.path).not.toBe(second.path);
    expect(first).toEqual(second);
  });

  it("isAncestorOf 沿 parent 链判定", () => {
    const { rootHandle, aHandle, a1Handle, bHandle } = setupTree();
    expect(rootHandle.isAncestorOf(a1Handle)).toBe(true);
    expect(aHandle.isAncestorOf(a1Handle)).toBe(true);
    expect(a1Handle.isAncestorOf(rootHandle)).toBe(false);
    expect(bHandle.isAncestorOf(a1Handle)).toBe(false);
  });
});

describe("ViewHandle 键盘走法", () => {
  it("prevSibling / nextSibling 走数据序而非挂载序", () => {
    const fixture = makeViewFixture();
    const a = addTask(fixture.store, fixture.root, "A", "a");
    const b = addTask(fixture.store, fixture.root, "B", "b");

    const rootHandle = mount(fixture.panel, fixture.root);
    const bHandle = mount(fixture.panel, b, rootHandle);
    const aHandle = mount(fixture.panel, a, rootHandle);

    expect(aHandle.nextSibling()).toBe(bHandle);
    expect(bHandle.prevSibling()).toBe(aHandle);
  });

  it("首尾兄弟越界返回 undefined", () => {
    const { aHandle, bHandle, rootHandle } = setupTree();
    expect(rootHandle.prevSibling()).toBeUndefined();
    expect(rootHandle.nextSibling()).toBeUndefined();
    expect(aHandle.prevSibling()).toBeUndefined();
    expect(bHandle.nextSibling()).toBeUndefined();
  });

  it("firstChild / lastChild 只返回已挂载子（折叠子树缺失 → undefined）", () => {
    const fixture = makeViewFixture();
    const a = addTask(fixture.store, fixture.root, "A", "a");
    const a1 = addTask(fixture.store, a, "A1", "a1");
    addTask(fixture.store, a, "A2", "a2");

    const rootHandle = mount(fixture.panel, fixture.root);
    const aHandle = mount(fixture.panel, a, rootHandle);
    const a1Handle = mount(fixture.panel, a1, aHandle);

    expect(aHandle.firstChild()).toBe(a1Handle);
    expect(aHandle.lastChild()).toBe(a1Handle);
    expect(rootHandle.firstChild()).toBe(aHandle);

    fixture.panelState.entry("panel").tree("root").setFolded(["a"], true);
    fixture.panel.registry.unregister(a1Handle);
    expect(aHandle.folded).toBe(true);
    expect(aHandle.firstChild()).toBeUndefined();
    expect(aHandle.lastChild()).toBeUndefined();
  });

  it("focusBottom 逐层 -2，落在末子编辑器", () => {
    const fixture = makeViewFixture();
    const a = addTask(fixture.store, fixture.root, "A", "a");
    const a1 = addTask(fixture.store, a, "A1", "a1");
    const a11 = addTask(fixture.store, a1, "A11", "a11");

    const rootHandle = mount(fixture.panel, fixture.root);
    const aHandle = mount(fixture.panel, a, rootHandle);
    const a1Handle = mount(fixture.panel, a1, aHandle);
    const a11Handle = mount(fixture.panel, a11, a1Handle);

    const editor = vi.fn<(cursor: number) => boolean>(() => true);
    a11Handle.focusEditor = editor;

    expect(rootHandle.focusBottom(10)).toBe(true);
    expect(editor).toHaveBeenCalledWith(4);
  });

  it("focusBottom 无子时调用自身编辑器、不补偿", () => {
    const { bHandle } = setupTree();
    const editor = vi.fn<(cursor: number) => boolean>(() => true);
    bHandle.focusEditor = editor;

    expect(bHandle.focusBottom(7)).toBe(true);
    expect(editor).toHaveBeenCalledWith(7);
  });

  it("focusNext 无下一兄弟时向上递归 +2；root 返回 false", () => {
    const { a1Handle, bHandle, rootHandle } = setupTree();
    const editor = vi.fn<(cursor: number) => boolean>(() => true);
    bHandle.focusEditor = editor;

    expect(a1Handle.focusNext(0)).toBe(true);
    expect(editor).toHaveBeenCalledWith(2);

    expect(rootHandle.focusNext(0)).toBe(false);
  });
});

describe("ViewHandle 折叠通道", () => {
  it("folded 读写直达 FoldTree", () => {
    const { aHandle, panel } = setupTree();
    const tree = panel.foldTrees.tree("root");

    expect(aHandle.folded).toBe(false);
    aHandle.folded = true;
    expect(tree.isFolded(["a"])).toBe(true);
    expect(aHandle.folded).toBe(true);

    aHandle.folded = false;
    expect(tree.isFolded(["a"])).toBe(false);
  });

  it("根条目实例读写根折叠态", () => {
    const { rootHandle, panel } = setupTree();
    rootHandle.folded = true;
    expect(panel.foldTrees.tree("root").isFolded([])).toBe(true);
  });
});

describe("ViewHandle DOM 接线（无 DOM 环境下的逻辑）", () => {
  function fakeEl() {
    return { style: { viewTransitionName: "" } } as unknown as HTMLElement;
  }

  it("bindPart 后写命名；unbind 或死接线 no-op", () => {
    const { rootHandle } = setupTree();
    const el = fakeEl();

    rootHandle.setTransitionName("title", "vt-1-title");
    expect(el.style.viewTransitionName).toBe("");

    rootHandle.bindPart("title", el);
    rootHandle.setTransitionName("title", "vt-1-title");
    expect(el.style.viewTransitionName).toBe("vt-1-title");

    rootHandle.setTransitionName("title", "none");
    expect(el.style.viewTransitionName).toBe("");

    rootHandle.unbindPart("title");
    expect(() =>
      rootHandle.setTransitionName("title", "vt-2-title"),
    ).not.toThrow();
  });

  it("clearTransitionName 比较清除", () => {
    const { rootHandle } = setupTree();
    const el = fakeEl();
    rootHandle.bindPart("title", el);

    rootHandle.setTransitionName("title", "vt-1-title");
    rootHandle.clearTransitionName("title", "vt-2-title");
    expect(el.style.viewTransitionName).toBe("vt-1-title");

    rootHandle.clearTransitionName("title", "vt-1-title");
    expect(el.style.viewTransitionName).toBe("");
  });
});
