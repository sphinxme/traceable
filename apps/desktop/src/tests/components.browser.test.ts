import * as Y from "yjs";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppServices } from "$lib/app/context.svelte";
import { Database } from "$lib/document/entities/database.svelte";
import { settle } from "$lib/view/settle";
import type { EditorPanel } from "$lib/view/panel.svelte";
import HarnessApp from "./fixtures/HarnessApp.svelte";
import HarnessWeekly from "./fixtures/HarnessWeekly.svelte";
import HarnessWeek from "./fixtures/HarnessWeek.svelte";

let mounted: { instance: ReturnType<typeof mount>; target: HTMLDivElement }[] =
  [];

afterEach(() => {
  for (const entry of mounted.reverse()) {
    unmount(entry.instance);
    entry.target.remove();
  }
  mounted = [];
});

function renderWeekly(db: Database): HTMLDivElement {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(HarnessWeekly, { target, props: { db } });
  mounted.push({ instance, target });
  flushSync();
  return target;
}

function renderWeek(db: Database): HTMLDivElement {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(HarnessWeek, { target, props: { db } });
  mounted.push({ instance, target });
  flushSync();
  return target;
}

function renderApp(db: Database): HTMLDivElement {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(HarnessApp, { target, props: { db } });
  mounted.push({ instance, target });
  flushSync();
  return target;
}

describe("组件接线（真实 Editor）", () => {
  it("挂载登记条目实例、绑定 part、折叠联动与 zoom 整树重建", async () => {
    const db = new Database(new Y.Doc());
    const root = db.userManager.rootTask!;
    const child = db.store.createTask("child", "child");
    root.attachChild(child);
    const grand = db.store.createTask("grand", "grand");
    child.attachChild(grand);

    const target = renderApp(db);
    const services = getAppServices();
    expect(services.database).toBe(db);

    const panel = services.directory.get("root")! as EditorPanel;
    expect(panel).toBeDefined();

    const rootHandle = panel.registry.root(root.id)!;
    expect(rootHandle).toBeDefined();

    const childRef = { panelId: "root", homeId: root.id, path: ["child"] };
    const childHandle = panel.registry.resolve(childRef)!;
    expect(childHandle).toBeDefined();
    expect(childHandle.parent).toBe(rootHandle);

    childHandle.setTransitionName("self", "vt-smoke-self");
    expect(
      [...target.querySelectorAll<HTMLElement>("*")].filter(
        (el) => el.style.viewTransitionName === "vt-smoke-self",
      ),
    ).toHaveLength(1);
    childHandle.clearTransitionName("self", "vt-smoke-self");

    childHandle.setTransitionName("list", "vt-smoke-list");
    expect(
      [...target.querySelectorAll<HTMLElement>("*")].filter(
        (el) => el.style.viewTransitionName === "vt-smoke-list",
      ),
    ).toHaveLength(1);
    childHandle.clearTransitionName("list", "vt-smoke-list");

    flushSync(() => {
      childHandle.folded = true;
    });
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(panel.registry.resolve(childRef)).toBeDefined();
    expect(
      panel.registry.resolve({
        panelId: "root",
        homeId: root.id,
        path: ["child", "grand"],
      }),
    ).toBeUndefined();

    flushSync(() => {
      childHandle.folded = false;
    });
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(
      panel.registry.resolve({
        panelId: "root",
        homeId: root.id,
        path: ["child", "grand"],
      }),
    ).toBeDefined();

    childHandle.setTransitionName("list", "vt-smoke-list-2");
    expect(
      [...target.querySelectorAll<HTMLElement>("*")].filter(
        (el) => el.style.viewTransitionName === "vt-smoke-list-2",
      ),
    ).toHaveLength(1);
    childHandle.clearTransitionName("list", "vt-smoke-list-2");

    const result = await panel.zoomInto(childHandle);
    expect(result.ok).toBe(true);
    expect(panel.currentHomeId).toBe("child");
    expect(panel.registry.root("child")).toBeDefined();
    expect(
      panel.registry.resolve({ panelId: "root", homeId: "child", path: [] }),
    ).toBeDefined();

    const back = await panel.popTo(0);
    expect(back.ok).toBe(true);
    expect(panel.currentHomeId).toBe(root.id);
  });
});

describe("组件接线（真实 Weekly）", () => {
  it("JournalPanel 挂载 15 个 home，注册 dir/门面", () => {
    const db = new Database(new Y.Doc());
    renderWeekly(db);

    const services = getAppServices();
    const panel = services.directory.get("weekly")!;
    expect(panel).toBeDefined();
    expect(panel.registry.roots()).toHaveLength(15);
    expect(db.store.journals.size).toBe(15);
  });
});

describe("组件接线（真实 Week）", () => {
  it("周历挂载、事件段登记与门面路由不抛", () => {
    const db = new Database(new Y.Doc());
    const task = db.store.createTask("meeting", "meeting");
    const now = Date.now();
    const event = task.insertEvent(now - 3_600_000, now + 3_600_000);

    const target = renderWeek(db);
    expect(target.innerHTML).not.toBe("");

    const services = getAppServices();
    expect(() => services.facade.highlightEvent(event.id, true)).not.toThrow();
    expect(() => services.facade.highlightEvent(event.id, false)).not.toThrow();
    expect(() => services.facade.revealEvent(event.id)).not.toThrow();
  });
});

describe("Quill 键位接线（返回值语义）", () => {
  it("Tab / Enter 已处理时不得向编辑器插入 \\t/换行", async () => {
    const db = new Database(new Y.Doc());
    const root = db.userManager.rootTask!;
    const a = db.store.createTask("A", "a");
    root.attachChild(a);
    const b = db.store.createTask("B", "b");
    root.attachChild(b);

    const target = renderApp(db);
    const services = getAppServices();
    const panel = services.directory.get("root")! as EditorPanel;

    const performs: Promise<unknown>[] = [];
    const original = panel.perform.bind(panel);
    vi.spyOn(panel, "perform").mockImplementation((spec) => {
      const promise = original(spec);
      performs.push(promise);
      return promise;
    });

    const aHandle = panel.registry.resolve({
      panelId: "root",
      homeId: root.id,
      path: ["a"],
    })!;
    const aEditor = [
      ...target.querySelectorAll<HTMLElement>(".ql-editor"),
    ].find((el) => el.textContent === "A")!;
    aEditor.focus();
    expect(aHandle.focusEditor(1)).toBe(true);
    aEditor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(performs).toHaveLength(0);
    expect(a.$text).toBe("A");

    const bHandle = panel.registry.resolve({
      panelId: "root",
      homeId: root.id,
      path: ["b"],
    })!;
    let bEditor = [...target.querySelectorAll<HTMLElement>(".ql-editor")].find(
      (el) => el.textContent === "B",
    )!;
    bEditor.focus();
    expect(bHandle.focusEditor(1)).toBe(true);

    bEditor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(performs).toHaveLength(1);
    await performs[0];

    expect(b.$text).toBe("B");
    expect(a.children.toIds()).toEqual(["b"]);

    const movedHandle = panel.registry.resolve({
      panelId: "root",
      homeId: root.id,
      path: ["a", "b"],
    })!;
    bEditor = [...target.querySelectorAll<HTMLElement>(".ql-editor")].find(
      (el) => el.textContent === "B",
    )!;
    bEditor.focus();
    expect(movedHandle.focusEditor(1)).toBe(true);

    bEditor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(performs).toHaveLength(2);
    await performs[1];

    expect(b.$text).toBe("B");
    expect(a.children.toIds()).toHaveLength(2);
  });
});

describe("Quill 键位接线（Title）", () => {
  it("Title 的 Tab 不向标题插入制表符", async () => {
    const db = new Database(new Y.Doc());
    const root = db.userManager.rootTask!;
    const a = db.store.createTask("A", "a");
    root.attachChild(a);

    const target = renderApp(db);
    const panel = getAppServices().directory.get("root")! as EditorPanel;

    const result = await panel.zoomInto(
      panel.registry.resolve({
        panelId: "root",
        homeId: root.id,
        path: ["a"],
      })!,
    );
    expect(result.ok).toBe(true);

    const titleEditor = target.querySelector<HTMLElement>(
      ".traceable-quill-title .ql-editor",
    )!;
    titleEditor.focus();
    panel.currentHomeHandle?.focusEditor(1);
    titleEditor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(a.$text).toBe("A");
  });
});
