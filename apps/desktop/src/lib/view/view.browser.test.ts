import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task } from "$lib/document/entities/task.svelte";
import { settle } from "$lib/view/settle";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import HarnessScene from "@/tests/fixtures/HarnessScene.svelte";
import HarnessTree from "@/tests/fixtures/HarnessTree.svelte";
import RegistryProbe from "@/tests/fixtures/RegistryProbe.svelte";
import { addTask } from "@/tests/fixtures/document";
import type { FakePanel } from "@/tests/fixtures/view";
import { makeViewFixture } from "@/tests/fixtures/view";

let instance: ReturnType<typeof mount> | undefined;
let target: HTMLDivElement | undefined;

function render(panel: FakePanel, task: Task): HTMLDivElement {
  target = document.createElement("div");
  document.body.append(target);
  instance = mount(HarnessScene, { target, props: { panel, task } });
  flushSync();
  return target;
}

afterEach(() => {
  if (instance) {
    unmount(instance);
    instance = undefined;
  }
  target?.remove();
  target = undefined;
});

function setup() {
  const fixture = makeViewFixture();
  const a = addTask(fixture.store, fixture.root, "A", "a");
  const a1 = addTask(fixture.store, a, "A1", "a1");
  addTask(fixture.store, fixture.root, "B", "b");
  return { ...fixture, a, a1 };
}

describe("Harness 挂载对称（G6/W1）", () => {
  it("挂载登记整棵树、卸载注销整棵树且子先于父", () => {
    const { panel, root } = setup();
    const container = render(panel, root);

    const rootHandle = panel.registry.root("root")!;
    expect(panel.registry.roots()).toEqual([rootHandle]);
    expect(rootHandle.children.size).toBe(2);
    expect(panel.registry.handlesOf("a")).toHaveLength(1);
    expect(panel.registry.handlesOf("a1")).toHaveLength(1);
    expect(container.querySelectorAll("[data-item]")).toHaveLength(3);

    const order: number[] = [];
    const original = panel.registry.unregister.bind(panel.registry);
    vi.spyOn(panel.registry, "unregister").mockImplementation(
      (handle: ViewHandle) => {
        order.push(handle.hid);
        original(handle);
      },
    );

    unmount(instance!);
    instance = undefined;
    flushSync();

    expect(order.lastIndexOf(rootHandle.hid)).toBe(order.length - 1);
    expect(panel.registry.roots()).toEqual([]);
    expect(panel.registry.handlesOf("a")).toEqual([]);
    expect(panel.registry.handlesOf("a1")).toEqual([]);
    expect(rootHandle.children.size).toBe(0);
  });

  it("currentHomeHandle 随 root register/unregister 响应式翻转", () => {
    const { panel, root } = setup();
    const probeTarget = document.createElement("div");
    const treeTarget = document.createElement("div");
    document.body.append(probeTarget, treeTarget);

    const probeInstance = mount(RegistryProbe, {
      target: probeTarget,
      props: { panel, homeId: root.id },
    });
    flushSync();
    const probe = probeTarget.querySelector('[data-testid="current-hid"]')!;
    const count = probeTarget.querySelector('[data-testid="root-count"]')!;
    expect(probe.textContent).toBe("none");
    expect(count.textContent).toBe("0");

    const treeInstance = mount(HarnessTree, {
      target: treeTarget,
      props: { panel, task: root },
    });
    flushSync();
    const hid = String(panel.registry.root("root")!.hid);
    expect(probe.textContent).toBe(hid);
    expect(count.textContent).toBe("1");

    unmount(treeInstance);
    flushSync();
    expect(probe.textContent).toBe("none");
    expect(count.textContent).toBe("0");

    unmount(probeInstance);
    probeTarget.remove();
    treeTarget.remove();
  });
});

describe("DOM 接线", () => {
  it("bindPart 绑定真实元素、setTransitionName 同步写", () => {
    const { panel, root } = setup();
    const container = render(panel, root);
    const rootHandle = panel.registry.root("root")!;
    const titleEl = container.querySelector<HTMLElement>(
      '[data-part="title"]',
    )!;

    rootHandle.setTransitionName("title", "vt-1-title");
    expect(titleEl.style.viewTransitionName).toBe("vt-1-title");
    expect(
      container.querySelector<HTMLElement>('[data-part="list"]'),
    ).not.toBeNull();

    rootHandle.setTransitionName("title", "none");
    expect(titleEl.style.viewTransitionName).toBe("");
  });

  it("clearTransitionName 只清自己写下的名字", () => {
    const { panel, root } = setup();
    const container = render(panel, root);
    const rootHandle = panel.registry.root("root")!;
    const titleEl = container.querySelector<HTMLElement>(
      '[data-part="title"]',
    )!;

    rootHandle.setTransitionName("title", "vt-1-title");
    rootHandle.clearTransitionName("title", "vt-2-title");
    expect(titleEl.style.viewTransitionName).toBe("vt-1-title");

    rootHandle.clearTransitionName("title", "vt-1-title");
    expect(titleEl.style.viewTransitionName).toBe("");
  });

  it("卸载后死接线 no-op，不触碰已脱离元素", () => {
    const { panel, root } = setup();
    const container = render(panel, root);
    const rootHandle = panel.registry.root("root")!;
    const titleEl = container.querySelector<HTMLElement>(
      '[data-part="title"]',
    )!;

    unmount(instance!);
    instance = undefined;
    flushSync();

    expect(() =>
      rootHandle.setTransitionName("title", "vt-1-title"),
    ).not.toThrow();
    expect(titleEl.style.viewTransitionName).toBe("");
  });
});

describe("折叠通道（G3）", () => {
  it("folded 写 FoldTree 驱动子树卸载与重挂载", async () => {
    const { panel, root } = setup();
    const container = render(panel, root);
    const rootHandle = panel.registry.root("root")!;
    const aHandle = rootHandle.children.get("a")!;

    expect(container.querySelector('[data-item="a1"]')).not.toBeNull();
    expect(panel.registry.handlesOf("a1")).toHaveLength(1);

    flushSync(() => {
      aHandle.folded = true;
    });

    expect(aHandle.folded).toBe(true);
    expect(container.querySelector('[data-item="a1"]')).toBeNull();
    expect(panel.registry.handlesOf("a1")).toEqual([]);
    expect(panel.registry.handlesOf("a")).toEqual([aHandle]);

    flushSync(() => {
      aHandle.folded = false;
    });

    expect(container.querySelector('[data-item="a1"]')).not.toBeNull();
    expect(panel.registry.handlesOf("a1")).toHaveLength(1);
  });

  it("settle 等待 Yjs → 响应式 → 挂载/注销全部落定", async () => {
    const { panel, root } = setup();
    const container = render(panel, root);
    const rootHandle = panel.registry.root("root")!;

    panel.foldTrees.tree(root.id).setFolded(["a"], true);
    expect(rootHandle.children.get("a")!.folded).toBe(true);

    await settle();

    expect(container.querySelector('[data-item="a1"]')).toBeNull();
    expect(panel.registry.handlesOf("a1")).toEqual([]);
  });
});
