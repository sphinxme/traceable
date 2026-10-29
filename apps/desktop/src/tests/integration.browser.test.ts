import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setAppServices, type AppServices } from "$lib/app/context.svelte";
import { addChild, remove } from "$lib/components/adapters/actions";
import { DnDAdapter } from "$lib/components/adapters/dnd-adapter";
import { KeyboardAdapter } from "$lib/components/adapters/keyboard-adapter";
import { DragService } from "$lib/interaction/drag-service.svelte";
import {
  CrossPanelFacade,
  type TaskRevealParticipant,
} from "$lib/interaction/cross-panel-facade";
import { FocusService } from "$lib/interaction/focus-service";
import type { PerformResult } from "$lib/protocol";
import type { Panel } from "$lib/view/panel.svelte";
import { EditorPanel } from "$lib/view/panel.svelte";
import { PanelDirectory } from "$lib/view/panel-directory";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import type { Context } from "quill/modules/keyboard";
import type Quill from "quill";
import HarnessEditor from "@/tests/fixtures/HarnessEditor.svelte";
import { addTask, ref } from "@/tests/fixtures/document";
import { makeViewFixture } from "@/tests/fixtures/view";

type Mounted = { instance: ReturnType<typeof mount>; target: HTMLDivElement };
let mounted: Mounted[] = [];

afterEach(() => {
  for (const entry of mounted.reverse()) {
    unmount(entry.instance);
    entry.target.remove();
  }
  mounted = [];
  vi.restoreAllMocks();
});

function renderEditor(panel: EditorPanel): HTMLDivElement {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(HarnessEditor, { target, props: { panel } });
  mounted.push({ instance, target });
  flushSync();
  return target;
}

function editorSetup(panelId = "root") {
  const fixture = makeViewFixture(panelId);
  const directory = new PanelDirectory();
  const focus = new FocusService(directory);
  const panel = new EditorPanel(
    panelId,
    fixture.store,
    fixture.panelState,
    focus,
    fixture.root.id,
  );
  directory.register(panel);
  return { ...fixture, panel, directory, focus };
}

/** 记录 perform 返回的 promise（适配层 fire-and-forget，测试需要等待）。 */
function capturePerforms(panel: Panel): Promise<PerformResult>[] {
  const promises: Promise<PerformResult>[] = [];
  const original = panel.perform.bind(panel);
  vi.spyOn(panel, "perform").mockImplementation((spec) => {
    const promise = original(spec);
    promises.push(promise);
    return promise;
  });
  return promises;
}

/** 新登记的目标条目实例接线 focusEditor，记录焦点时点。 */
function captureFocus(panel: Panel, taskIds: string[]) {
  const calls: Array<{
    taskId: string;
    cursor: number;
    namesAtFocus: string[];
  }> = [];
  const original = panel.registry.register.bind(panel.registry);
  vi.spyOn(panel.registry, "register").mockImplementation(
    (handle: ViewHandle) => {
      original(handle);
      if (!taskIds.includes(handle.task.id)) return;
      handle.focusEditor = (cursor) => {
        calls.push({
          taskId: handle.task.id,
          cursor,
          namesAtFocus: [
            ...document.querySelectorAll<HTMLElement>("[data-part]"),
          ]
            .map((el) => el.style.viewTransitionName)
            .filter(Boolean),
        });
        return true;
      };
    },
  );
  return calls;
}

function lastPerform(
  promises: Promise<PerformResult>[],
): Promise<PerformResult> {
  return promises.at(-1)!;
}

function q(text: string): Quill {
  return { getText: () => text } as unknown as Quill;
}

function ctx(prefix: string, suffix: string): Context {
  return { prefix, suffix, offset: 0 } as unknown as Context;
}

function itemEl(container: ParentNode, taskId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-item="${taskId}"]`);
}

function rootListIds(container: ParentNode, homeId: string): string[] {
  const list = container.querySelector<HTMLElement>(
    `[data-list-of="${homeId}"]`,
  )!;
  return [...list.children]
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .map((child) => child.dataset.item)
    .filter((id): id is string => Boolean(id));
}

function namesInDocument(): string[] {
  return [...document.querySelectorAll<HTMLElement>("[data-part]")]
    .map((el) => el.style.viewTransitionName)
    .filter(Boolean);
}

function dragStart(adapter: DnDAdapter, handle: ViewHandle) {
  const data = { setData: vi.fn(), effectAllowed: "" };
  adapter.onDragStart({ dataTransfer: data } as unknown as DragEvent, handle);
}

describe("集成：键盘", () => {
  it("Tab：动画 + 焦点落位 + 折叠迁移", async () => {
    const f = editorSetup();
    const a = addTask(f.store, f.root, "A", "a");
    addTask(f.store, f.root, "B", "b");
    f.panel.foldTrees.tree(f.root.id).setFolded(["b"], true);

    const performs = capturePerforms(f.panel);
    const focusCalls = captureFocus(f.panel, ["b"]);
    const container = renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);

    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;
    ka.onTab(bHandle, 3);
    const result = await lastPerform(performs);

    expect(result.ok).toBe(true);
    expect(a.children.toIds()).toEqual(["b"]);
    expect(f.panel.foldTrees.tree(f.root.id).isFolded(["b"])).toBe(false);
    expect(f.panel.foldTrees.tree(f.root.id).isFolded(["a", "b"])).toBe(true);

    expect(focusCalls).toHaveLength(1);
    expect(focusCalls[0]).toMatchObject({ taskId: "b", cursor: 3 });
    expect(focusCalls[0].namesAtFocus).toEqual([]);

    const bEl = itemEl(container, "b")!;
    expect(bEl.closest('[data-list-of="a"]')).not.toBeNull();
    expect(namesInDocument()).toEqual([]);
  });

  it("Shift+Tab：动画 + 焦点落位 + 折叠迁移", async () => {
    const f = editorSetup();
    const a = addTask(f.store, f.root, "A", "a");
    addTask(f.store, a, "B", "b");
    f.panel.foldTrees.tree(f.root.id).setFolded(["a", "b"], true);

    const performs = capturePerforms(f.panel);
    const focusCalls = captureFocus(f.panel, ["b"]);
    const container = renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);

    const bHandle = f.panel.registry.resolve(
      ref("root", f.root.id, ["a", "b"]),
    )!;
    ka.onUntab(bHandle, 1);
    const result = await lastPerform(performs);

    expect(result.ok).toBe(true);
    expect(f.root.children.toIds()).toEqual(["a", "b"]);
    expect(f.panel.foldTrees.tree(f.root.id).isFolded(["a", "b"])).toBe(false);
    expect(f.panel.foldTrees.tree(f.root.id).isFolded(["b"])).toBe(true);

    expect(focusCalls).toHaveLength(1);
    expect(focusCalls[0]).toMatchObject({ taskId: "b", cursor: 1 });
    expect(
      itemEl(container, "b")!.closest('[data-list-of="root"]'),
    ).not.toBeNull();
  });

  it("Enter case 2.1：root 子首插 + 焦点落位", async () => {
    const f = editorSetup();
    vi.spyOn(f.ops, "newTaskId").mockReturnValue("new-root");
    const performs = capturePerforms(f.panel);
    const focusCalls = captureFocus(f.panel, ["new-root"]);
    const container = renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);

    const rootHandle = f.panel.registry.root(f.root.id)!;
    ka.onEnter(rootHandle, { index: 0 } as never, ctx("ROOT", ""), q("ROOT"));
    expect((await lastPerform(performs)).ok).toBe(true);

    expect(f.root.children.toIds()[0]).toBe("new-root");
    expect(itemEl(container, "new-root")).not.toBeNull();
    expect(focusCalls).toHaveLength(1);
    expect(focusCalls[0]).toMatchObject({ taskId: "new-root", cursor: 0 });
  });

  it("Enter case 2.2 / case 3：父列表后位/前位插入", async () => {
    const f = editorSetup();
    addTask(f.store, f.root, "B", "b");
    const c = addTask(f.store, f.root, "C", "c");
    f.panel.foldTrees.tree(f.root.id).setFolded(["b"], true);
    const performs = capturePerforms(f.panel);
    renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);

    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;
    vi.spyOn(f.ops, "newTaskId").mockReturnValueOnce("after-b");
    ka.onEnter(bHandle, { index: 0 } as never, ctx("B", ""), q("B"));
    expect((await lastPerform(performs)).ok).toBe(true);
    expect(f.root.children.toIds()).toEqual(["b", "after-b", "c"]);

    const cHandle = f.panel.registry.resolve(ref("root", f.root.id, ["c"]))!;
    vi.spyOn(f.ops, "newTaskId").mockReturnValueOnce("before-c");
    ka.onEnter(cHandle, { index: 0 } as never, ctx("", "C"), q("C"));
    expect((await lastPerform(performs)).ok).toBe(true);
    expect(f.root.children.toIds()).toEqual(["b", "after-b", "before-c", "c"]);
  });

  it("Enter case 4：split + 焦点回原出现", async () => {
    const f = editorSetup();
    const task = addTask(f.store, f.root, "HELLO", "task");
    vi.spyOn(f.ops, "newTaskId").mockReturnValue("prefix");
    const performs = capturePerforms(f.panel);
    const focusCalls = captureFocus(f.panel, ["task", "prefix"]);
    const container = renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);

    const handle = f.panel.registry.resolve(ref("root", f.root.id, ["task"]))!;
    ka.onEnter(handle, { index: 2 } as never, ctx("HE", "LLO"), q("HELLO"));
    expect((await lastPerform(performs)).ok).toBe(true);

    expect(f.root.children.toIds()).toEqual(["prefix", "task"]);
    expect(f.store.getTask("prefix")!.$text).toBe("HE");
    expect(task.$text).toBe("LLO");
    expect(focusCalls.at(-1)).toMatchObject({ taskId: "task", cursor: 0 });
    expect(itemEl(container, "prefix")).not.toBeNull();
  });

  it("Shift+Enter：noteOpen 翻转（无 op）", () => {
    const f = editorSetup();
    addTask(f.store, f.root, "B", "b");
    renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);
    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;

    const perform = vi.spyOn(f.panel, "perform");
    expect(ka.onShiftEnter(bHandle)).toBe(true);
    expect(bHandle.noteOpen).toBe(true);
    expect(ka.onShiftEnter(bHandle)).toBe(true);
    expect(bHandle.noteOpen).toBe(false);
    expect(perform).not.toHaveBeenCalled();
  });

  it("Arrow 上下：渲染树感知（折叠）与焦点落位", () => {
    const f = editorSetup();
    const a = addTask(f.store, f.root, "A", "a");
    addTask(f.store, a, "A1", "a1");
    addTask(f.store, f.root, "B", "b");
    f.panel.foldTrees.tree(f.root.id).setFolded(["a"], true);

    const focusCalls = captureFocus(f.panel, ["a", "b", "a1"]);
    renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);
    const rootHandle = f.panel.registry.root(f.root.id)!;
    const aHandle = f.panel.registry.resolve(ref("root", f.root.id, ["a"]))!;
    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;

    ka.onArrowDown(rootHandle, 5);
    expect(focusCalls.at(-1)).toMatchObject({ taskId: "a", cursor: 3 });

    ka.onArrowDown(aHandle, 0);
    expect(focusCalls.at(-1)).toMatchObject({ taskId: "b", cursor: 0 });

    flushSync(() => {
      aHandle.folded = false;
    });
    ka.onArrowUp(bHandle, 5);
    expect(focusCalls.at(-1)).toMatchObject({ taskId: "a1", cursor: 3 });
  });
});

describe("集成：拖放", () => {
  it("同列表 reorder：动画 + DOM/数据收敛", async () => {
    const f = editorSetup();
    addTask(f.store, f.root, "A", "a");
    addTask(f.store, f.root, "B", "b");
    addTask(f.store, f.root, "C", "c");

    const performs = capturePerforms(f.panel);
    const container = renderEditor(f.panel);
    const ds = new DragService();
    const dnd = new DnDAdapter(ds, f.ops);

    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;
    const rootHandle = f.panel.registry.root(f.root.id)!;
    dragStart(dnd, bHandle);
    dnd.onDrop({ parentHandle: rootHandle, index: 3 }, false);
    dnd.onDragEnd();

    expect((await lastPerform(performs)).ok).toBe(true);
    expect(f.root.children.toIds()).toEqual(["a", "c", "b"]);
    expect(rootListIds(container, f.root.id)).toEqual(["a", "c", "b"]);
    expect(namesInDocument()).toEqual([]);
  });

  it("同树 reparent：动画 + DOM 换父", async () => {
    const f = editorSetup();
    const a = addTask(f.store, f.root, "A", "a");
    addTask(f.store, f.root, "B", "b");

    const performs = capturePerforms(f.panel);
    const container = renderEditor(f.panel);
    const ds = new DragService();
    const dnd = new DnDAdapter(ds, f.ops);

    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;
    const aHandle = f.panel.registry.resolve(ref("root", f.root.id, ["a"]))!;
    dragStart(dnd, bHandle);
    dnd.onDrop({ parentHandle: aHandle, index: 0 }, false);
    dnd.onDragEnd();

    expect((await lastPerform(performs)).ok).toBe(true);
    expect(a.children.toIds()).toEqual(["b"]);
    expect(
      itemEl(container, "b")!.closest('[data-list-of="a"]'),
    ).not.toBeNull();
  });

  it("跨面板 link（默认）与 move（+meta）", async () => {
    const f = editorSetup();
    addTask(f.store, f.root, "B", "b");
    const rootB = addTask(f.store, undefined, "ROOT-B", "root-b");

    const otherFixture = f.panelState;
    const directory = new PanelDirectory();
    const focus = new FocusService(directory);
    const panelB = new EditorPanel(
      "panel-b",
      f.store,
      otherFixture,
      focus,
      rootB.id,
    );
    directory.register(panelB);

    addTask(f.store, f.root, "E", "e");
    capturePerforms(f.panel);
    const performsB = capturePerforms(panelB);
    const containerA = renderEditor(f.panel);
    const containerB = renderEditor(panelB);
    const ds = new DragService();
    const dnd = new DnDAdapter(ds, f.ops);

    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;
    const rootBHandle = panelB.registry.root("root-b")!;

    dragStart(dnd, bHandle);
    dnd.onDrop({ parentHandle: rootBHandle, index: 0 }, false);
    dnd.onDragEnd();
    expect((await lastPerform(performsB)).ok).toBe(true);
    expect(f.store.getTask("b")!.parents.toIds().sort()).toEqual([
      "root",
      "root-b",
    ]);
    expect(itemEl(containerA, "b")).not.toBeNull();
    expect(itemEl(containerB, "b")).not.toBeNull();

    const eHandle = f.panel.registry.resolve(ref("root", f.root.id, ["e"]))!;
    dragStart(dnd, eHandle);
    dnd.onDrop({ parentHandle: rootBHandle, index: 1 }, true);
    dnd.onDragEnd();
    expect((await lastPerform(performsB)).ok).toBe(true);
    expect(f.store.getTask("e")!.parents.toIds()).toEqual(["root-b"]);
    expect(itemEl(containerA, "e")).toBeNull();
    expect(itemEl(containerB, "e")).not.toBeNull();
  });

  it("sameSpot：拒绝且不发起 perform", () => {
    const f = editorSetup();
    addTask(f.store, f.root, "A", "a");
    addTask(f.store, f.root, "B", "b");
    const container = renderEditor(f.panel);
    const perform = vi.spyOn(f.panel, "perform");
    const ds = new DragService();
    const dnd = new DnDAdapter(ds, f.ops);

    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;
    const rootHandle = f.panel.registry.root(f.root.id)!;
    dragStart(dnd, bHandle);
    dnd.onDrop({ parentHandle: rootHandle, index: 1 }, false);
    dnd.onDragEnd();

    expect(perform).not.toHaveBeenCalled();
    expect(rootListIds(container, f.root.id)).toEqual(["a", "b"]);
  });
});

describe("集成：actions", () => {
  it("remove：数据删除 + DOM 移除", async () => {
    const f = editorSetup();
    setAppServices({ ops: f.ops } as unknown as AppServices);
    addTask(f.store, f.root, "A", "a");
    addTask(f.store, f.root, "B", "b");

    const performs = capturePerforms(f.panel);
    const container = renderEditor(f.panel);
    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;

    remove(f.panel, bHandle);
    expect((await lastPerform(performs)).ok).toBe(true);
    expect(f.store.getTask("b")).toBeUndefined();
    expect(itemEl(container, "b")).toBeNull();
  });

  it("addChild：末位插入 + DOM 新增", async () => {
    const f = editorSetup();
    setAppServices({ ops: f.ops } as unknown as AppServices);
    addTask(f.store, f.root, "A", "a");
    vi.spyOn(f.ops, "newTaskId").mockReturnValue("added");

    const performs = capturePerforms(f.panel);
    const container = renderEditor(f.panel);
    const rootHandle = f.panel.registry.root(f.root.id)!;

    addChild(f.panel, rootHandle);
    expect((await lastPerform(performs)).ok).toBe(true);
    expect(f.root.children.toIds()).toEqual(["a", "added"]);
    expect(itemEl(container, "added")).not.toBeNull();
  });
});

describe("集成：zoom", () => {
  it("zoomInto / popTo：zoom 配对 + DOM 整树重建", async () => {
    const f = editorSetup();
    const a = addTask(f.store, f.root, "A", "a");
    addTask(f.store, a, "B", "b");

    const container = renderEditor(f.panel);
    expect(
      container.querySelector(`[data-root="${f.root.id}"]`),
    ).not.toBeNull();

    const result = await f.panel.zoomInto(
      f.panel.registry.resolve(ref("root", f.root.id, ["a"]))!,
    );
    expect(result.ok).toBe(true);
    expect(f.panel.currentHomeId).toBe("a");
    expect(container.querySelector('[data-root="a"]')).not.toBeNull();
    expect(itemEl(container, "b")).not.toBeNull();
    expect(namesInDocument()).toEqual([]);

    const back = await f.panel.popTo(0);
    expect(back.ok).toBe(true);
    expect(f.panel.currentHomeId).toBe(f.root.id);
    expect(
      container.querySelector(`[data-root="${f.root.id}"]`),
    ).not.toBeNull();
    expect(itemEl(container, "a")).not.toBeNull();
    expect(namesInDocument()).toEqual([]);
  });
});

describe("集成：门面", () => {
  it("focusTask 循环切换出现 + 跨 home reveal", async () => {
    const f = editorSetup();
    const a = addTask(f.store, f.root, "A", "a");
    const t = addTask(f.store, a, "T", "t");
    const d = addTask(f.store, f.root, "D", "d");
    d.attachChild(t);
    const h = addTask(f.store, a, "H", "h");
    f.panel.foldTrees.navPaths = [f.root.id, a.id, h.id];

    const reveals: Promise<ViewHandle | undefined>[] = [];
    const originalReveal = f.panel.reveal.bind(f.panel);
    vi.spyOn(f.panel, "reveal").mockImplementation((r, opts) => {
      const promise = originalReveal(r, opts);
      reveals.push(promise);
      return promise;
    });

    const container = renderEditor(f.panel);
    expect(f.panel.currentHomeId).toBe("h");

    const facade = new CrossPanelFacade();
    facade.registerTaskParticipant(f.panel as TaskRevealParticipant);

    // 当前 home h → 第一个出现 [a, t]：跨 home 自动导航到 a
    facade.focusTask(t.id);
    const first = await reveals.at(-1)!;
    expect(first?.task.id).toBe("t");
    expect(f.panel.currentHomeId).toBe("a");
    expect(itemEl(container, "t")).not.toBeNull();
    expect(first!.highlightUntil).toBeGreaterThan(Date.now());

    // 同一任务再次点击 → 循环到下一个出现 [d, t]：跳变导航到 d
    facade.focusTask(t.id);
    const second = await reveals.at(-1)!;
    expect(second?.task.id).toBe("t");
    expect(f.panel.currentHomeId).toBe("d");
    expect(second?.path()).toEqual(["t"]);
    expect(itemEl(container, "t")).not.toBeNull();
  });
});

describe("集成：skip 链", () => {
  it("连按 Tab（互不依赖的两段）：双方簿记完成、无孤儿命名、焦点终值 = 后者", async () => {
    const f = editorSetup();
    const a = addTask(f.store, f.root, "A", "a");
    addTask(f.store, f.root, "B", "b");
    const c = addTask(f.store, f.root, "C", "c");
    const d = addTask(f.store, f.root, "D", "d");

    const performs = capturePerforms(f.panel);
    const focusCalls = captureFocus(f.panel, ["b", "d"]);
    renderEditor(f.panel);
    const ka = new KeyboardAdapter(f.ops);
    const bHandle = f.panel.registry.resolve(ref("root", f.root.id, ["b"]))!;
    const dHandle = f.panel.registry.resolve(ref("root", f.root.id, ["d"]))!;

    ka.onTab(bHandle, 1);
    ka.onTab(dHandle, 2);

    const results = await Promise.all(performs);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(a.children.toIds()).toEqual(["b"]);
    expect(c.children.toIds()).toEqual(["d"]);
    expect(namesInDocument()).toEqual([]);
    expect(focusCalls).toHaveLength(2);
    expect(focusCalls.at(-1)).toMatchObject({ taskId: "d", cursor: 2 });
  });
});
