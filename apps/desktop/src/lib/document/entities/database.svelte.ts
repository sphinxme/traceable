import * as Y from "yjs";
import { Store } from "./store.svelte";
import { UserManager } from "./user.svelte";

/**
 * Database：数据层顶层编排器，组合 Y.Doc、Store（数据访问）与 UserManager（根任务管理）。
 *
 * 实例由 App.svelte 在 Y.Doc 加载完成后创建，并交给 AppProvider 装配 AppServices。
 */
export class Database {
  readonly doc: Y.Doc;
  readonly store: Store;
  readonly userManager: UserManager;

  public constructor(doc: Y.Doc) {
    this.doc = doc;
    this.store = new Store(doc);
    this.userManager = new UserManager(this.store.user, this.store);
  }

  /** 清空全部数据（委托 Store.clear，含面板状态）。 */
  public clear() {
    this.store.clear();
  }

  /**
   * 导入 export() 的产物：先全量清空（panelStates 一并清除，面板状态不随导入迁移），
   * 事务中重建五类数据，最后 pruneCache。
   */
  public import(data: ReturnType<typeof Database.prototype.export>) {
    this.clear();

    this.doc.transact(() => {
      const store = this.store;
      Object.entries(data.tasks).forEach(([id, task]) => {
        const { children, parents, events, ...others } = task;
        store.tasks.set(
          id,
          new Y.Map(
            Object.entries({
              ...others,
              children: Y.Array.from(children),
              parents: Y.Array.from(parents),
              events: Y.Array.from(events),
            }),
          ),
        );
      });
      Object.entries(data.texts).forEach(([id, text]) => {
        store.texts.set(id, new Y.Text(text));
      });
      Object.entries(data.events).forEach(([id, event]) => {
        store.events.set(id, new Y.Map(Object.entries(event)));
      });
      Object.entries(data.journals).forEach(([id, journal]) => {
        store.journals.set(id, new Y.Map(Object.entries(journal)));
      });
      store.user.set("rootTaskId", data.user.rootTaskId);
    });

    this.store.pruneCache();
  }

  /** 全量序列化 tasks / texts / events / journals / user（不含 panelStates；journal.time 为毫秒时间戳）。 */
  public export() {
    const tasks = this.store.tasks.toJSON() as Record<
      string,
      {
        id: string;
        textId: string;
        children: string[];
        parents: string[];
        events: string[];
        status: "DONE" | "TODO" | "BLOCKED";
      }
    >;
    const texts = this.store.texts.toJSON() as Record<string, string>;
    const events = this.store.events.toJSON() as Record<
      string,
      {
        id: string;
        taskId: string;
        start: number;
        end: number;
      }
    >;
    const journals = this.store.journals.toJSON() as Record<
      string,
      {
        id: string;
        type: "WEEK" | "DAY";
        taskId: string;
        time: string;
      }
    >;
    const user = this.store.user.toJSON() as {
      rootTaskId: string;
    };

    return {
      tasks,
      texts,
      events,
      journals,
      user,
    };
  }
}
