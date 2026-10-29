/**
 * 数据世界装置：一份内存 Y.Doc + Store / PanelState / OutlineOps 的最小装配。
 *
 * 扩展纪律：document 级装置只加在这里（建树、地址、事务计数、快照、孤儿键收集），
 * 用例不手搓 Yjs 布局；本文件不引入 DOM 或 Svelte 组件，node project 直接消费。
 */
import * as Y from "yjs";
import { Store } from "$lib/document/entities/store.svelte";
import type { Task } from "$lib/document/entities/task.svelte";
import { PanelState } from "$lib/document/panel-state/panel-state";
import { OutlineOps } from "$lib/outline-ops/ops";
import type { EdgeRef, OccurrenceRef } from "$lib/protocol";

/** 内存文档装置：固定 id 的 root 任务。 */
export function makeDocumentFixture() {
  const doc = new Y.Doc();
  const store = new Store(doc);
  const panelState = new PanelState(store);
  const ops = new OutlineOps(store, panelState);
  const root = store.createTask("ROOT", "root");
  return { doc, store, panelState, ops, root };
}

/** 建实体（可指定 id），可选挂到 parent 下。 */
export function addTask(
  store: Store,
  parent?: Task,
  text = "",
  taskId?: string,
): Task {
  const task = store.createTask(text, taskId);
  parent?.attachChild(task);
  return task;
}

/** 按给定 id 依次建链，返回新建任务列表（顺序从 parent 子到孙）。 */
export function addChain(store: Store, parent: Task, ids: string[]): Task[] {
  const tasks: Task[] = [];
  let current = parent;
  for (const taskId of ids) {
    const task = addTask(store, current, taskId, taskId);
    tasks.push(task);
    current = task;
  }
  return tasks;
}

/** 出现地址构造糖。 */
export function ref(
  panelId: string,
  homeId: string,
  path: string[],
): OccurrenceRef {
  return { panelId, homeId, path };
}

function taskIdOf(taskOrId: Task | string): string {
  return typeof taskOrId === "string" ? taskOrId : taskOrId.id;
}

/** 边引用构造糖。 */
export function edge(parent: Task | string, child: Task | string): EdgeRef {
  return { parentTaskId: taskIdOf(parent), childTaskId: taskIdOf(child) };
}

/** 统计 fn 执行期间产生的顶层 Yjs 事务数（嵌套合并计 1）。 */
export function countTransactions(doc: Y.Doc, fn: () => void): number {
  let count = 0;
  const handler = () => {
    count++;
  };
  doc.on("afterTransaction", handler);
  try {
    fn();
  } finally {
    doc.off("afterTransaction", handler);
  }
  return count;
}

/** 收集全部面板折叠树中的实体键（去重），用于 G10 孤儿折叠键断言。 */
export function foldKeys(store: Store): string[] {
  const keys = new Set<string>();

  const collect = (node: Y.Map<any>) => {
    for (const [key, value] of node) {
      if (!(value instanceof Y.Map)) continue;
      keys.add(key);
      collect(value);
    }
  };

  for (const panelYMap of store.panelStates.values()) {
    if (!(panelYMap instanceof Y.Map)) continue;
    const homes = panelYMap.get("homes");
    if (!(homes instanceof Y.Map)) continue;
    collect(homes);
  }

  return [...keys];
}

/** 全量数据 JSON 快照，用于失败零写入断言。 */
export function snapshot(store: Store) {
  return {
    tasks: store.tasks.toJSON(),
    texts: store.texts.toJSON(),
    events: store.events.toJSON(),
    journals: store.journals.toJSON(),
    panelStates: store.panelStates.toJSON(),
    user: store.user.toJSON(),
  };
}
