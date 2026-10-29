import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { Store } from "$lib/document/entities/store.svelte";
import {
  addTask,
  countTransactions,
  makeDocumentFixture,
} from "@/tests/fixtures/document";

describe("Store.createTask", () => {
  it("默认空文本与自动 id", () => {
    const { store } = makeDocumentFixture();
    const task = store.createTask();

    expect(task.$text).toBe("");
    expect(task.id).toBeTruthy();
    expect(task.status).toBe("TODO");
    expect(task.children.toIds()).toEqual([]);
    expect(task.parents.toIds()).toEqual([]);
    expect(task.events.toIds()).toEqual([]);
    expect(task.noteDoc).toBeInstanceOf(Y.XmlFragment);
  });

  it("支持预生成 id", () => {
    const { store } = makeDocumentFixture();
    const task = store.createTask("hello", "task-1");

    expect(task.id).toBe("task-1");
    expect(store.getTask("task-1")).toBe(task);
  });

  it("标题 Text 与 Task 在同一事务内创建", () => {
    const { doc, store } = makeDocumentFixture();

    const count = countTransactions(doc, () => {
      store.createTask("atomic", "atomic-task");
    });

    expect(count).toBe(1);
  });

  it("同 id 覆盖后清缓存并返回新实例", () => {
    const { store } = makeDocumentFixture();
    const first = store.createTask("first", "dup");
    const second = store.createTask("second", "dup");

    expect(second).not.toBe(first);
    expect(store.getTask("dup")).toBe(second);
    expect(second.$text).toBe("second");
  });
});

describe("Store.tasksVersion", () => {
  it("随任务增删变化", () => {
    const { store } = makeDocumentFixture();
    expect(store.tasksVersion).toBe(1);

    store.createTask("a", "a");
    expect(store.tasksVersion).toBe(2);

    store.deleteEntity("a");
    expect(store.tasksVersion).toBe(1);
  });
});

describe("Store.deleteEntity", () => {
  it("纯清理任务/text/event/缓存，保留父子链接", () => {
    const { store, root } = makeDocumentFixture();
    const child = addTask(store, root, "child", "child");
    const event = store.createEvent(child.id, 1, 2);
    const textId = child.textId;

    store.deleteEntity(child.id);

    expect(store.getTask(child.id)).toBeUndefined();
    expect(store.tasks.has(child.id)).toBe(false);
    expect(store.texts.has(textId)).toBe(false);
    expect(store.events.has(event.id)).toBe(false);
    expect(store.getEvent(event.id)).toBeUndefined();
    expect(root.children.toIds()).toEqual(["child"]);
  });

  it("不存在 id 为 no-op", () => {
    const { store } = makeDocumentFixture();
    expect(() => store.deleteEntity("missing")).not.toThrow();
    expect(store.tasksVersion).toBe(1);
  });
});

describe("Journal", () => {
  it("task 缺失时构造不抛、task 为 undefined", () => {
    const { doc, store } = makeDocumentFixture();

    doc.transact(() => {
      const journal = new Y.Map();
      journal.set("id", "journal-1");
      journal.set("type", "WEEK");
      journal.set("taskId", "missing");
      journal.set("time", 0);
      store.journals.set("journal-1", journal);
    });

    const journal = store.getJournal("journal-1");
    expect(journal).toBeDefined();
    expect(journal!.task).toBeUndefined();
  });
});

describe("Task 链接原语", () => {
  it("attachChild 重复挂载抛错", () => {
    const { store, root } = makeDocumentFixture();
    const child = addTask(store, root, "child", "child");

    expect(() => root.attachChild(child)).toThrow("duplicate child");
  });

  it("detachChild 不存在的边抛错", () => {
    const { store, root } = makeDocumentFixture();
    const orphan = addTask(store, undefined, "orphan", "orphan");

    expect(() => root.detachChild(orphan)).toThrow("item not found");
  });
});
