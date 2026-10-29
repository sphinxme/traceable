import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import type { Task } from "$lib/document/entities/task.svelte";
import { ViewHandle } from "$lib/view/view-handle.svelte";
import type { FakePanel } from "@/tests/fixtures/view";
import { makeViewFixture } from "@/tests/fixtures/view";
import { addTask, ref } from "@/tests/fixtures/document";

function mount(panel: FakePanel, task: Task, parent?: ViewHandle): ViewHandle {
  const handle = new ViewHandle(panel, task, parent);
  panel.registry.register(handle);
  return handle;
}

function setup() {
  const fixture = makeViewFixture();
  const a = addTask(fixture.store, fixture.root, "A", "a");
  const a1 = addTask(fixture.store, a, "A1", "a1");
  const rootHandle = mount(fixture.panel, fixture.root);
  const aHandle = mount(fixture.panel, a, rootHandle);
  const a1Handle = mount(fixture.panel, a1, aHandle);
  return { ...fixture, a, a1, rootHandle, aHandle, a1Handle };
}

describe("ViewRegistry register / unregister", () => {
  it("三索引同步写入", () => {
    const { panel, root, a, rootHandle, aHandle } = setup();

    expect(panel.registry.roots()).toEqual([rootHandle]);
    expect(panel.registry.root(root.id)).toBe(rootHandle);
    expect(panel.registry.handlesOf(a.id)).toEqual([aHandle]);
    expect(rootHandle.children.get(a.id)).toBe(aHandle);
  });

  it("注销后三索引同步清除", () => {
    const { panel, a, rootHandle, aHandle } = setup();

    panel.registry.unregister(aHandle);
    expect(rootHandle.children.has(a.id)).toBe(false);
    expect(panel.registry.handlesOf(a.id)).toEqual([]);
    expect(panel.registry.root("root")).toBe(rootHandle);
  });

  it("根条目实例注销要求子条目实例已先注销", () => {
    const { panel, rootHandle, aHandle } = setup();

    expect(() => panel.registry.unregister(rootHandle)).toThrow(
      /before children/,
    );

    panel.registry.unregister(aHandle);
    panel.registry.unregister(rootHandle);
    expect(panel.registry.roots()).toEqual([]);
  });

  it("同父重复挂载 = dev 断言", () => {
    const { panel, a, rootHandle } = setup();
    const duplicate = new ViewHandle(panel, a, rootHandle);
    expect(() => panel.registry.register(duplicate)).toThrow(/duplicate mount/);
  });

  it("同 home 双 root = dev 断言", () => {
    const { panel, root } = setup();
    expect(() => panel.registry.register(new ViewHandle(panel, root))).toThrow(
      /duplicate root/,
    );
  });

  it("reorder 不触碰索引：条目实例与索引内容不变", () => {
    const fixture = makeViewFixture();
    const a = addTask(fixture.store, fixture.root, "A", "a");
    const b = addTask(fixture.store, fixture.root, "B", "b");
    const rootHandle = mount(fixture.panel, fixture.root);
    const aHandle = mount(fixture.panel, a, rootHandle);
    const bHandle = mount(fixture.panel, b, rootHandle);

    const childrenArray = fixture.root.yMap.get("children") as Y.Array<string>;
    fixture.doc.transact(() => {
      childrenArray.delete(0, 1);
      childrenArray.insert(1, [a.id]);
    });

    expect(fixture.root.children.toIds()).toEqual(["b", "a"]);
    expect(rootHandle.children.get(a.id)).toBe(aHandle);
    expect(rootHandle.children.get(b.id)).toBe(bHandle);
    expect(aHandle.path()).toEqual(["a"]);
    expect(fixture.panel.registry.handlesOf(a.id)).toEqual([aHandle]);
  });
});

describe("ViewRegistry resolve", () => {
  it("命中 root / 逐级 path", () => {
    const { panel, rootHandle, aHandle, a1Handle } = setup();

    expect(panel.registry.resolve(ref("panel", "root", []))).toBe(rootHandle);
    expect(panel.registry.resolve(ref("panel", "root", ["a"]))).toBe(aHandle);
    expect(panel.registry.resolve(ref("panel", "root", ["a", "a1"]))).toBe(
      a1Handle,
    );
  });

  it("未挂载 home / 折叠 miss / 死路径 → undefined", () => {
    const { panel, a1Handle } = setup();
    panel.registry.unregister(a1Handle);

    expect(panel.registry.resolve(ref("panel", "home", []))).toBeUndefined();
    expect(
      panel.registry.resolve(ref("panel", "root", ["a", "a1"])),
    ).toBeUndefined();
    expect(
      panel.registry.resolve(ref("panel", "root", ["missing"])),
    ).toBeUndefined();
  });

  it("跨面板地址 = dev 断言", () => {
    const { panel } = setup();
    expect(() => panel.registry.resolve(ref("other", "root", []))).toThrow(
      /foreign panel/,
    );
  });

  it("resolveChild 按父条目实例查子", () => {
    const { panel, a, rootHandle, aHandle } = setup();
    expect(panel.registry.resolveChild(rootHandle, a.id)).toBe(aHandle);
    expect(panel.registry.resolveChild(rootHandle, "missing")).toBeUndefined();
  });

  it("handlesOf 返回拷贝（调用方不可破坏内部集合）", () => {
    const { panel, a } = setup();
    const handles = panel.registry.handlesOf(a.id);
    handles.length = 0;
    expect(panel.registry.handlesOf(a.id)).toHaveLength(1);
  });
});
