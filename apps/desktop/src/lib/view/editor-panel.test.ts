import { describe, expect, it, vi } from "vitest";
import { FocusService } from "$lib/interaction/focus-service";
import type { OccurrenceRef, PerformSpec } from "$lib/protocol";
import { EditorPanel } from "$lib/view/panel.svelte";
import { PanelDirectory } from "$lib/view/panel-directory";
import { ViewHandle } from "$lib/view/view-handle.svelte";
import { addTask, ref } from "@/tests/fixtures/document";
import { makeViewFixture } from "@/tests/fixtures/view";

function setup() {
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
  return { ...fixture, panel, directory, focus };
}

function mount(
  panel: EditorPanel,
  taskId: string,
  parent?: ViewHandle,
  fixture?: ReturnType<typeof setup>,
) {
  const task = fixture!.store.getTask(taskId)!;
  const handle = new ViewHandle(panel, task, parent);
  panel.registry.register(handle);
  return handle;
}

describe("EditorPanel navTaskList 净化", () => {
  it("缺省 = [navRoot]，isRootHome = true", () => {
    const { panel, root } = setup();
    expect(panel.navTaskList.map((t) => t.id)).toEqual([root.id]);
    expect(panel.currentHomeId).toBe(root.id);
    expect(panel.isRootHome).toBe(true);
    expect(panel.currentHomeHandle).toBeUndefined();
  });

  it("持久 navPaths → navTaskList 映射", () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");

    panel.foldTrees.navPaths = [root.id, a.id];
    expect(panel.navTaskList.map((t) => t.id)).toEqual([root.id, a.id]);
    expect(panel.currentHomeId).toBe("a");
    expect(panel.isRootHome).toBe(false);
  });

  it("死 id 截断到最后有效前缀，且不回写原始栈", () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    addTask(store, a, "C", "c");

    panel.foldTrees.navPaths = [root.id, a.id, "gone", "c"];
    expect(panel.navTaskList.map((t) => t.id)).toEqual([root.id, "a"]);
    expect(panel.navPaths).toEqual([root.id, a.id, "gone", "c"]);
  });

  it("全部失效回退 navRoot", () => {
    const { panel, root } = setup();
    panel.foldTrees.navPaths = ["gone-1", "gone-2"];
    expect(panel.navTaskList.map((t) => t.id)).toEqual([root.id]);
    expect(panel.currentHomeId).toBe(root.id);
  });

  it("响应远端删除栈成员", () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    const b = addTask(store, a, "B", "b");
    panel.foldTrees.navPaths = [root.id, a.id, b.id];
    expect(panel.currentHomeId).toBe("b");

    store.deleteEntity(b.id);
    expect(panel.navTaskList.map((t) => t.id)).toEqual([root.id, a.id]);
    expect(panel.currentHomeId).toBe("a");
  });

  it("响应远端 navPaths 写入", () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    const d = addTask(store, root, "D", "d");

    panel.foldTrees.navPaths = [root.id, a.id];
    expect(panel.currentHomeId).toBe("a");

    panel.foldTrees.navPaths = [root.id, d.id];
    expect(panel.currentHomeId).toBe("d");
  });
});

describe("EditorPanel findOccurrencePaths（搜索方言）", () => {
  it("从 navRoot 搜索、产出搜索地址", () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    const t = addTask(store, a, "T", "t");
    addTask(store, root, "D", "d");

    expect(panel.findOccurrencePaths(t.id)).toEqual([
      { panelId: "root", homeId: root.id, path: ["a", "t"] },
    ]);
  });

  it("target = navRoot → [[]]", () => {
    const { panel, root } = setup();
    expect(panel.findOccurrencePaths(root.id)).toEqual([
      { panelId: "root", homeId: root.id, path: [] },
    ]);
  });

  it("多父多路径", () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    const d = addTask(store, root, "D", "d");
    const t = addTask(store, a, "T", "t");
    d.attachChild(t);

    const paths = panel.findOccurrencePaths(t.id).map((r) => r.path);
    expect(paths).toEqual([
      ["a", "t"],
      ["d", "t"],
    ]);
  });

  it("不可达 → []", () => {
    const { panel } = setup();
    expect(panel.findOccurrencePaths("missing")).toEqual([]);
  });
});

describe("EditorPanel navigate", () => {
  it("静态校验：空栈 / 首项非 navRoot → invalid（不进 perform）", async () => {
    const { panel, store, root } = setup();
    const d = addTask(store, root, "D", "d");
    const perform = vi.spyOn(panel, "perform");

    expect(await panel.navigate([])).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await panel.navigate([d])).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(perform).not.toHaveBeenCalled();
  });

  it("恒等短路：不启动过渡、返回当前栈描述符", async () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    panel.foldTrees.navPaths = [root.id, a.id];
    const perform = vi.spyOn(panel, "perform");

    const result = await panel.navigate([root, a]);
    expect(result).toEqual({
      ok: true,
      change: {
        op: "navigated",
        panelId: "root",
        homeId: "a",
        paths: [root.id, a.id],
      },
    });
    expect(perform).not.toHaveBeenCalled();
  });

  it("成功导航：写入 navPaths 并返回描述符", async () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");

    const result = await panel.navigate([root, a]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.change).toEqual({
        op: "navigated",
        panelId: "root",
        homeId: "a",
        paths: [root.id, a.id],
      });
    }
    expect(panel.navPaths).toEqual([root.id, a.id]);
    expect(panel.currentHomeId).toBe("a");
  });

  it("执行期重校验：栈成员实体已死 → notFound 且零写入", async () => {
    const { panel, store, root } = setup();
    const gone = addTask(store, root, "GONE", "gone");
    store.deleteEntity(gone.id);

    const result = await panel.navigate([root, gone]);
    expect(result).toEqual({ ok: false, reason: "notFound" });
    expect(panel.navPaths).toEqual([]);
  });
});

describe("EditorPanel #zoomPairing（经 perform 捕获）", () => {
  function capture(panel: EditorPanel) {
    const specs: PerformSpec[] = [];
    vi.spyOn(panel, "perform").mockImplementation(async (spec) => {
      specs.push(spec);
      return {
        ok: true,
        change: {
          op: "navigated",
          panelId: panel.id,
          homeId: "x",
          paths: [],
        },
      };
    });
    return specs;
  }

  it("延伸（zoom-into）：源 = 新 home 的当前条目，目标 = 新 home root", async () => {
    const fixture = setup();
    const { panel, store, root } = fixture;
    const a = addTask(store, root, "A", "a");
    panel.foldTrees.navPaths = [root.id];
    mount(panel, root.id, undefined, fixture);
    const aHandle = mount(panel, a.id, panel.registry.root(root.id)!, fixture);
    const specs = capture(panel);

    await panel.navigate([root, a]);
    expect(specs[0].animate).toEqual({
      kind: "zoom",
      source: aHandle,
      target: { panelId: "root", homeId: "a", path: [] },
    });
  });

  it("源 miss（折叠/未挂载）→ 无动画", async () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    panel.foldTrees.navPaths = [root.id];
    const specs = capture(panel);

    await panel.navigate([root, a]);
    expect(specs[0].animate).toBeUndefined();
  });

  it("截断（zoom-out）：源 = 当前 home root，目标 = 旧 home 在新视图中的条目", async () => {
    const fixture = setup();
    const { panel, store, root } = fixture;
    const a = addTask(store, root, "A", "a");
    panel.foldTrees.navPaths = [root.id, a.id];
    const aRoot = mount(panel, a.id, undefined, fixture);
    const specs = capture(panel);

    await panel.navigate([root]);
    expect(specs[0].animate).toEqual({
      kind: "zoom",
      source: aRoot,
      target: { panelId: "root", homeId: root.id, path: ["a"] },
    });
  });

  it("跳变（非前缀关系）→ 无动画", async () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    const d = addTask(store, root, "D", "d");
    panel.foldTrees.navPaths = [root.id, a.id];
    const specs = capture(panel);

    await panel.navigate([root, d]);
    expect(specs[0].animate).toBeUndefined();
  });
});

describe("EditorPanel popTo / zoomInto", () => {
  it("popTo 越界/非整数 → invalid；有效 → 截断导航", async () => {
    const { panel, store, root } = setup();
    const a = addTask(store, root, "A", "a");
    panel.foldTrees.navPaths = [root.id, a.id];
    const navigate = vi.spyOn(panel, "navigate").mockResolvedValue({
      ok: true,
      change: { op: "navigated", panelId: "root", homeId: "x", paths: [] },
    });

    expect(await panel.popTo(-1)).toEqual({ ok: false, reason: "invalid" });
    expect(await panel.popTo(2)).toEqual({ ok: false, reason: "invalid" });
    expect(await panel.popTo(0.5)).toEqual({ ok: false, reason: "invalid" });
    expect(navigate).not.toHaveBeenCalled();

    await panel.popTo(0);
    expect(navigate).toHaveBeenCalledWith([root]);
  });

  it("zoomInto：跨面板/非当前 home 条目实例 → invalid", async () => {
    const fixture = setup();
    const { panel, store, root } = fixture;
    const a = addTask(store, root, "A", "a");
    const aHandle = mount(panel, a.id, undefined, fixture);
    const other = new EditorPanel(
      "other",
      store,
      fixture.panelState,
      fixture.focus,
      root.id,
    );
    const navigate = vi.spyOn(panel, "navigate");

    expect(await panel.zoomInto(aHandle)).toEqual({
      ok: false,
      reason: "invalid",
    });
    const foreign = new ViewHandle(other, a, undefined);
    expect(await panel.zoomInto(foreign)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("zoomInto 有效：导航栈追加条目实例路径", async () => {
    const fixture = setup();
    const { panel, store, root } = fixture;
    const a = addTask(store, root, "A", "a");
    const t = addTask(store, a, "T", "t");
    panel.foldTrees.navPaths = [root.id];
    const rootHandle = mount(panel, root.id, undefined, fixture);
    const aHandle = mount(panel, a.id, rootHandle, fixture);
    const tHandle = mount(panel, t.id, aHandle, fixture);
    const navigate = vi.spyOn(panel, "navigate").mockResolvedValue({
      ok: true,
      change: { op: "navigated", panelId: "root", homeId: "x", paths: [] },
    });

    await panel.zoomInto(tHandle);
    expect(navigate).toHaveBeenCalledWith([root, a, t]);
  });
});

describe("EditorPanel normalizeRef 边界（经 reveal 输入）", () => {
  it("dev 断言 panelId 一致", async () => {
    const { panel } = setup();
    await expect(panel.reveal(ref("other", "root", []))).rejects.toThrow();
  });
});
