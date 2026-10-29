import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task } from "$lib/document/entities/task.svelte";
import { FocusService } from "$lib/interaction/focus-service";
import type { OccurrenceRef } from "$lib/protocol";
import type { PanelDirectory } from "$lib/view/panel-directory";
import { PanelDirectory as Directory } from "$lib/view/panel-directory";
import type { ViewHandle } from "$lib/view/view-handle.svelte";
import HarnessTree from "@/tests/fixtures/HarnessTree.svelte";
import { TestPanel } from "@/tests/fixtures/TestPanel";
import { addTask, edge, ref } from "@/tests/fixtures/document";
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

function render(panel: TestPanel, task: Task): HTMLDivElement {
  target = document.createElement("div");
  document.body.append(target);
  instance = mount(HarnessTree, { target, props: { panel, task } });
  flushSync();
  return target;
}

function setup(taskIds = ["a", "b", "c", "d"]) {
  const fixture = makeViewFixture("panel");
  const directory: PanelDirectory = new Directory();
  const focus = new FocusService(directory);
  const panel = new TestPanel(
    "panel",
    fixture.store,
    fixture.panelState,
    focus,
  );
  directory.register(panel);

  const tasks = new Map<string, Task>();
  for (const taskId of taskIds) {
    tasks.set(
      taskId,
      addTask(fixture.store, fixture.root, taskId.toUpperCase(), taskId),
    );
  }
  return { ...fixture, panel, directory, tasks };
}

/** 记录目标任务的焦点调用与命名写/清（新登记条目实例才会被仪器化）。 */
function instrument(panel: TestPanel, taskIds: string[]) {
  const focusCalls: Array<{
    cursor: number;
    hid: number;
    namesAtFocus: string[];
  }> = [];
  const setNames: string[] = [];
  const clearedNames: string[] = [];

  const originalRegister = panel.registry.register.bind(panel.registry);
  vi.spyOn(panel.registry, "register").mockImplementation(
    (handle: ViewHandle) => {
      originalRegister(handle);
      if (!taskIds.includes(handle.task.id)) return;

      handle.focusEditor = (cursor: number) => {
        focusCalls.push({
          cursor,
          hid: handle.hid,
          namesAtFocus: namesInDocument(),
        });
        return true;
      };
      const set = handle.setTransitionName.bind(handle);
      handle.setTransitionName = (part, name) => {
        if (name !== "none") setNames.push(`${handle.task.id}:${name}`);
        set(part, name);
      };
      const clear = handle.clearTransitionName.bind(handle);
      handle.clearTransitionName = (part, name) => {
        clearedNames.push(`${handle.task.id}:${name}`);
        clear(part, name);
      };
    },
  );

  return { focusCalls, setNames, clearedNames };
}

function namesInDocument(): string[] {
  return [...document.querySelectorAll<HTMLElement>("[data-part]")]
    .map((el) => el.style.viewTransitionName)
    .filter(Boolean);
}

function itemEl(container: ParentNode, taskId: string): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-item="${taskId}"]`)!;
}

describe("perform 动画路径", () => {
  it("happy：nameSource 先行、op 在回调内、nameTarget 于 settle 后、cleanup 后焦点", async () => {
    const { panel, root, tasks, ops } = setup();
    const container = render(panel, root);

    const oldB = itemEl(container, "b");
    const oldBHandle = panel.registry.resolve(ref("panel", "root", ["b"]))!;
    const to = ref("panel", "root", ["a", "b"]);
    const { focusCalls, setNames, clearedNames } = instrument(panel, ["b"]);

    const original = document.startViewTransition.bind(document);
    const namesAtStart: string[] = [];
    vi.spyOn(document, "startViewTransition").mockImplementation((callback) => {
      namesAtStart.push(oldB.style.viewTransitionName);
      return original(callback);
    });

    let opCalls = 0;
    let nameAtOp = "";
    const promise = panel.perform({
      op: () => {
        opCalls++;
        nameAtOp = oldB.style.viewTransitionName;
        return ops.indent(edge(root, tasks.get("b")!), {
          from: oldBHandle.ref(),
          to,
        });
      },
      animate: { kind: "item-move", source: oldBHandle, target: to },
      focus: { ref: to, cursor: 4 },
    });

    expect(opCalls).toBe(0);

    const result = await promise;

    expect(result.ok).toBe(true);
    expect(opCalls).toBe(1);
    expect(namesAtStart).toHaveLength(1);
    expect(namesAtStart[0]).toMatch(/^vt-\d+-self$/);
    expect(nameAtOp).toBe(namesAtStart[0]);

    expect(setNames).toContain(`b:${namesAtStart[0]}`);
    expect(clearedNames).toContain(`b:${namesAtStart[0]}`);

    const newB = itemEl(container, "b");
    expect(newB).not.toBe(oldB);
    expect(container.contains(oldB)).toBe(false);
    expect(newB.style.viewTransitionName).toBe("");
    expect(namesInDocument()).toEqual([]);

    expect(focusCalls).toHaveLength(1);
    expect(focusCalls[0].cursor).toBe(4);
    expect(focusCalls[0].namesAtFocus).toEqual([]);
  });

  it("op 失败 abort：目标不命名、结果透传、焦点不执行", async () => {
    const { panel, root } = setup();
    const container = render(panel, root);

    const oldB = itemEl(container, "b");
    const oldBHandle = panel.registry.resolve(ref("panel", "root", ["b"]))!;
    const to = ref("panel", "root", ["a", "b"]);
    const { focusCalls } = instrument(panel, ["b"]);

    const result = await panel.perform({
      op: () => ({ ok: false, reason: "cycle" }),
      animate: { kind: "item-move", source: oldBHandle, target: to },
      focus: { ref: to, cursor: 0 },
    });

    expect(result).toEqual({ ok: false, reason: "cycle" });
    expect(panel.registry.resolve(to)).toBeUndefined();
    expect(oldB.style.viewTransitionName).toBe("");
    expect(namesInDocument()).toEqual([]);
    expect(focusCalls).toEqual([]);
  });

  it("skip 链：双方簿记完成、结果必达、焦点终值 = 后者", async () => {
    const { panel, root, tasks, ops } = setup();
    const container = render(panel, root);

    const bHandle = panel.registry.resolve(ref("panel", "root", ["b"]))!;
    const dHandle = panel.registry.resolve(ref("panel", "root", ["d"]))!;
    const to1 = ref("panel", "root", ["a", "b"]);
    const to2 = ref("panel", "root", ["c", "d"]);
    const { focusCalls } = instrument(panel, ["b", "d"]);

    const first = panel.perform({
      op: () =>
        ops.indent(edge(root, tasks.get("b")!), {
          from: bHandle.ref(),
          to: to1,
        }),
      animate: { kind: "item-move", source: bHandle, target: to1 },
      focus: { ref: to1, cursor: 1 },
    });
    const second = panel.perform({
      op: () =>
        ops.indent(edge(root, tasks.get("d")!), {
          from: dHandle.ref(),
          to: to2,
        }),
      animate: { kind: "item-move", source: dHandle, target: to2 },
      focus: { ref: to2, cursor: 2 },
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    expect(panel.registry.resolve(to1)).toBeDefined();
    expect(panel.registry.resolve(to2)).toBeDefined();
    expect(namesInDocument()).toEqual([]);

    expect(focusCalls).toHaveLength(2);
    expect(focusCalls.at(-1)!.cursor).toBe(2);
    expect(focusCalls.map((call) => call.cursor).sort()).toEqual([1, 2]);
  });

  it("startViewTransition 同步抛：清源命名、重入非动画且 op 恰一次", async () => {
    const { panel, root, tasks, ops } = setup();
    const container = render(panel, root);

    const oldB = itemEl(container, "b");
    const oldBHandle = panel.registry.resolve(ref("panel", "root", ["b"]))!;
    const to = ref("panel", "root", ["a", "b"]);
    const { focusCalls } = instrument(panel, ["b"]);

    vi.spyOn(document, "startViewTransition").mockImplementation(() => {
      throw new Error("vt unavailable");
    });

    let opCalls = 0;
    const result = await panel.perform({
      op: () => {
        opCalls++;
        return ops.indent(edge(root, tasks.get("b")!), {
          from: oldBHandle.ref(),
          to,
        });
      },
      animate: { kind: "item-move", source: oldBHandle, target: to },
      focus: { ref: to, cursor: 3 },
    });

    expect(result.ok).toBe(true);
    expect(opCalls).toBe(1);
    expect(oldB.style.viewTransitionName).toBe("");
    expect(panel.registry.resolve(to)).toBeDefined();
    expect(focusCalls).toHaveLength(1);
    expect(focusCalls[0].cursor).toBe(3);
  });

  it("环境无 startViewTransition：降级非动画路径、focus 保留", async () => {
    const { panel, root, tasks, ops } = setup();
    render(panel, root);

    const bHandle = panel.registry.resolve(ref("panel", "root", ["b"]))!;
    const to = ref("panel", "root", ["a", "b"]);
    const { focusCalls } = instrument(panel, ["b"]);

    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
    try {
      let opCalls = 0;
      const result = await panel.perform({
        op: () => {
          opCalls++;
          return ops.indent(edge(root, tasks.get("b")!), {
            from: bHandle.ref(),
            to,
          });
        },
        animate: { kind: "item-move", source: bHandle, target: to },
        focus: { ref: to, cursor: 5 },
      });

      expect(result.ok).toBe(true);
      expect(opCalls).toBe(1);
      expect(focusCalls).toHaveLength(1);
      expect(focusCalls[0].cursor).toBe(5);
    } finally {
      delete (document as unknown as { startViewTransition?: unknown })
        .startViewTransition;
    }
  });
});

describe("perform 非动画路径", () => {
  it("op 抛异常 → invalid（P1 兜底）", async () => {
    const { panel } = setup();
    const result = await panel.perform({
      op: () => {
        throw new Error("boom");
      },
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("insert：settle 后焦点命中新出现", async () => {
    const { panel, root, ops } = setup();
    const container = render(panel, root);

    const newId = "new-task";
    const to: OccurrenceRef = {
      panelId: "panel",
      homeId: "root",
      path: [newId],
    };
    const { focusCalls } = instrument(panel, [newId]);

    const result = await panel.perform({
      op: () => ops.insert(root, 0, "NEW", newId, { to }),
      focus: { ref: to, cursor: 0 },
    });

    expect(result.ok).toBe(true);
    expect(itemEl(container, newId)).not.toBeNull();
    expect(focusCalls).toHaveLength(1);
    expect(focusCalls[0].cursor).toBe(0);
    expect(focusCalls[0].namesAtFocus).toEqual([]);
  });
});
