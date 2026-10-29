import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { Store } from "$lib/document/entities/store.svelte";

describe("node 测试环境", () => {
  it("可通过 $lib 导入 .svelte.ts 并直读 Store/Task getter", () => {
    const store = new Store(new Y.Doc());
    const task = store.createTask("hello");

    expect(task.id).toBeTruthy();
    expect(task.$text).toBe("hello");
    expect(task.status).toBe("TODO");
    expect(task.children.toArray()).toEqual([]);
    expect(store.getTask(task.id)).toBe(task);
  });

  it("同一 Y.Doc 上的实体数据可被新 Store 实例读取", () => {
    const doc = new Y.Doc();
    const first = new Store(doc);
    const task = first.createTask("shared");

    const second = new Store(doc);
    expect(second.getTask(task.id)?.$text).toBe("shared");
  });
});
