import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusService } from "$lib/interaction/focus-service";
import type { OccurrenceRef } from "$lib/protocol";
import { EditorPanel } from "$lib/view/panel.svelte";
import { PanelDirectory } from "$lib/view/panel-directory";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import HarnessEditor from "@/tests/fixtures/HarnessEditor.svelte";
import { addChain, addTask, ref } from "@/tests/fixtures/document";
import { makeViewFixture } from "@/tests/fixtures/view";

let instance: ReturnType<typeof mount> | undefined;
let target: HTMLDivElement | undefined;

afterEach(() => {
  if (instance) {
    unmount(instance);
    instance = undefined;
  }
  target?.remove();
  target = undefined;
  vi.restoreAllMocks();
});

function setup(navPaths?: string[]) {
  const fixture = makeViewFixture("root");
  const directory = new PanelDirectory();
  const focus = new FocusService(directory);
  const panel = new EditorPanel(
    "root",
    fixture.store,
    fixture.panelState,
    focus,
    fixture.root.id,
  );
  directory.register(panel);
  if (navPaths) panel.foldTrees.navPaths = navPaths;
  return { ...fixture, panel, directory, focus };
}

function render(panel: EditorPanel): HTMLDivElement {
  target = document.createElement("div");
  document.body.append(target);
  instance = mount(HarnessEditor, { target, props: { panel } });
  flushSync();
  return target;
}

function instrumentScroll(panel: EditorPanel, taskId: string) {
  const calls: number[] = [];
  const original = panel.registry.register.bind(panel.registry);
  vi.spyOn(panel.registry, "register").mockImplementation(
    (handle: ViewHandle) => {
      original(handle);
      if (handle.task.id === taskId) {
        handle.scrollIntoView = () => calls.push(handle.hid);
      }
    },
  );
  return calls;
}

function searchRef(path: string[]): OccurrenceRef {
  return ref("root", "root", path);
}

describe("reveal 端到端（EditorPanel.normalizeRef 边界表）", () => {
  it("目标深藏当前 home 之下：展开折叠链 → settle → resolve → scroll/highlight", async () => {
    const { panel, store, root } = setup();
    const [a, h, x, t] = addChain(store, root, ["a", "h", "x", "t"]);
    panel.foldTrees.navPaths = [root.id, a.id, h.id];
    panel.foldTrees.tree(h.id).setFolded(["x"], true);

    const scroll = instrumentScroll(panel, t.id);
    const container = render(panel);
    expect(container.querySelector('[data-item="t"]')).toBeNull();

    const handle = await panel.reveal(searchRef(["a", "h", "x", "t"]), {
      scroll: true,
      highlight: true,
    });

    expect(handle?.task.id).toBe("t");
    expect(panel.currentHomeId).toBe(h.id);
    expect(container.querySelector('[data-item="t"]')).not.toBeNull();
    expect(scroll).toHaveLength(1);
    expect(handle!.highlightUntil).toBeGreaterThan(Date.now());
  });

  it("目标 = 当前 home：返回根条目实例", async () => {
    const { panel, store, root } = setup();
    const [a, h] = addChain(store, root, ["a", "h"]);
    panel.foldTrees.navPaths = [root.id, a.id, h.id];
    render(panel);

    const handle = await panel.reveal(searchRef(["a", "h"]));

    expect(handle?.task.id).toBe("h");
    expect(handle?.parent).toBeUndefined();
    expect(panel.currentHomeId).toBe(h.id);
  });

  it("目标 = 当前 home 的祖先：截断导航（zoom-out）→ 祖先条目", async () => {
    const { panel, store, root } = setup();
    const [a, h] = addChain(store, root, ["a", "h"]);
    panel.foldTrees.navPaths = [root.id, a.id, h.id];
    render(panel);
    const vt = vi.spyOn(document, "startViewTransition");

    const handle = await panel.reveal(searchRef(["a"]));

    expect(panel.currentHomeId).toBe(root.id);
    expect(handle?.task.id).toBe("a");
    expect(handle?.path()).toEqual(["a"]);
    expect(vt).toHaveBeenCalled();
  });

  it("目标 = 当前 home 的直接父：截断到父的父 → 父条目", async () => {
    const { panel, store, root } = setup();
    const [a, b, h] = addChain(store, root, ["a", "b", "h"]);
    panel.foldTrees.navPaths = [root.id, a.id, b.id, h.id];
    render(panel);

    const handle = await panel.reveal(searchRef(["a", "b"]));

    expect(panel.currentHomeId).toBe(a.id);
    expect(handle?.task.id).toBe("b");
    expect(handle?.path()).toEqual(["b"]);
  });

  it("目标 = navRoot 的直接子、当前在根：恒等短路后命中条目", async () => {
    const { panel, store, root } = setup();
    const d = addTask(store, root, "D", "d");
    render(panel);
    const vt = vi.spyOn(document, "startViewTransition");

    const handle = await panel.reveal(searchRef(["d"]));

    expect(panel.currentHomeId).toBe(root.id);
    expect(handle?.task.id).toBe(d.id);
    expect(handle?.path()).toEqual(["d"]);
    expect(vt).not.toHaveBeenCalled();
  });

  it("目标在另一分支：跳变导航（无动画）→ 目标条目", async () => {
    const { panel, store, root } = setup();
    const [a, h] = addChain(store, root, ["a", "h"]);
    const [d, t2] = addChain(store, root, ["d", "t2"]);
    panel.foldTrees.navPaths = [root.id, a.id, h.id];
    render(panel);
    const vt = vi.spyOn(document, "startViewTransition");

    const handle = await panel.reveal(searchRef(["d", "t2"]));

    expect(panel.currentHomeId).toBe(d.id);
    expect(handle?.task.id).toBe(t2.id);
    expect(handle?.path()).toEqual(["t2"]);
    expect(vt).not.toHaveBeenCalled();
  });

  it("目标 = navRoot 自身：导航回根并返回根条目实例", async () => {
    const { panel, store, root } = setup();
    const [a, h] = addChain(store, root, ["a", "h"]);
    panel.foldTrees.navPaths = [root.id, a.id, h.id];
    render(panel);

    const handle = await panel.reveal(searchRef([]));

    expect(panel.currentHomeId).toBe(root.id);
    expect(handle?.task.id).toBe(root.id);
    expect(handle?.parent).toBeUndefined();
  });

  it("祖先链断（并发删除）→ undefined", async () => {
    const { panel } = setup();
    render(panel);

    const handle = await panel.reveal(searchRef(["ghost", "t"]));

    expect(handle).toBeUndefined();
  });
});
