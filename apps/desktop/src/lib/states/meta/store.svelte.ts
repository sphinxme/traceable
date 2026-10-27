import * as Y from "yjs";
import { Task } from "./task.svelte";
import { Event } from "./event.svelte";
import { Journal } from "./journal.svelte";
import { createYMapKeysSubscriber } from "./reactive-yjs";
import { id } from "./utils";

/**
 * Store：Yjs 数据的唯一访问入口，持有 Y.Doc 全部顶层 Map，负责实体 CRUD 与实例缓存。
 *
 * Y.Doc 顶层 Map 布局：
 * - tasks:       Y.Map<Y.Map>   所有 Task
 * - texts:       Y.Map<Y.Text>  Task 标题文本（textId → Y.Text）
 * - events:      Y.Map<Y.Map>   所有 Event
 * - journals:    Y.Map<Y.Map>   所有 Journal
 * - panelStates: Y.Map          面板 UI 状态（结构见 ../states/StatesTree.svelte.ts）
 * - user:        Y.Map          用户数据（rootTaskId）
 *
 * getTask / getEvent / getJournal 以 Map 缓存实体代理避免重复构造，
 * 对应数据被删除时同步清理缓存。
 */
export class Store {
  readonly doc: Y.Doc;
  readonly tasks: Y.Map<Y.Map<any>>;
  readonly texts: Y.Map<Y.Text>;
  readonly journals: Y.Map<Y.Map<any>>;
  readonly events: Y.Map<Y.Map<any>>;
  readonly panelStates: Y.Map<any>;
  readonly user: Y.Map<any>;

  private taskCache = new Map<string, Task>();
  private eventCache = new Map<string, Event>();
  private journalCache = new Map<string, Journal>();

  private readonly subscribeTasksMap: () => void;
  private readonly subscribeEventsMap: () => void;

  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.tasks = doc.getMap("tasks");
    this.texts = doc.getMap("texts");
    this.journals = doc.getMap("journals");
    this.events = doc.getMap("events");
    this.panelStates = doc.getMap("panelStates");
    this.user = doc.getMap("user");

    this.subscribeTasksMap = createYMapKeysSubscriber(this.tasks);
    this.subscribeEventsMap = createYMapKeysSubscriber(this.events);
  }

  /** 事务中清空全部顶层 Map（含 panelStates 与 user）。 */
  clear() {
    this.doc.transact(() => {
      this.tasks.clear();
      this.texts.clear();
      this.journals.clear();
      this.events.clear();
      this.panelStates.clear();
      this.user.clear();
    });
  }

  /** 读取 Task（带缓存）；不存在时清缓存并返回 undefined。 */
  getTask(id: string): Task | undefined {
    const yMap = this.tasks.get(id);
    if (!yMap) {
      this.taskCache.delete(id);
      return undefined;
    }

    let task = this.taskCache.get(id);
    if (!task) {
      task = new Task(yMap, this);
      this.taskCache.set(id, task);
    }
    return task;
  }

  /** 创建 Task：新建标题 Y.Text，事务中初始化 Y.Map（noteDoc、空链接列表，status 默认 TODO）。 */
  createTask(text = ""): Task {
    const textId = this.createText(text);
    const taskId = id();

    this.doc.transact(() => {
      const taskYMap = new Y.Map();
      taskYMap.set("id", taskId);
      taskYMap.set("textId", textId);
      taskYMap.set("noteDoc", new Y.XmlFragment());
      taskYMap.set("children", new Y.Array());
      taskYMap.set("parents", new Y.Array());
      taskYMap.set("events", new Y.Array());
      taskYMap.set("status", "TODO");

      this.tasks.set(taskId, taskYMap);
    });

    return this.getTask(taskId)!;
  }

  /** 级联删除 Task：销毁 noteDoc、删除标题 Text、解除与父/子的双向链接、删除关联 Event。 */
  deleteTask(id: string): void {
    const task = this.getTask(id);
    if (!task) return;

    this.doc.transact(() => {
      const taskYMap = this.tasks.get(id);
      if (taskYMap) {
        const noteDoc = taskYMap.get("noteDoc");
        if (noteDoc) {
          noteDoc.destroy();
        }

        const textId = taskYMap.get("textId");
        if (textId) this.texts.delete(textId);

        const parents = (taskYMap.get("parents") as Y.Array<string>).toArray();
        for (const parentId of parents) {
          const parentYMap = this.tasks.get(parentId);
          if (parentYMap) {
            const childrenArr = parentYMap.get("children") as Y.Array<string>;
            const idx = childrenArr.toArray().indexOf(id);
            if (idx !== -1) childrenArr.delete(idx, 1);
          }
        }

        const children = (
          taskYMap.get("children") as Y.Array<string>
        ).toArray();
        for (const childId of children) {
          const childYMap = this.tasks.get(childId);
          if (childYMap) {
            const parentsArr = childYMap.get("parents") as Y.Array<string>;
            const idx = parentsArr.toArray().indexOf(id);
            if (idx !== -1) parentsArr.delete(idx, 1);
          }
        }

        const eventIds = (taskYMap.get("events") as Y.Array<string>).toArray();
        for (const eventId of eventIds) {
          this.events.delete(eventId);
          this.eventCache.delete(eventId);
        }

        this.tasks.delete(id);
        this.taskCache.delete(id);
      }
    });
  }

  /** 全部 Task；响应式——tasks 键集变化触发更新。 */
  get allTasks(): Task[] {
    this.subscribeTasksMap();
    const result: Task[] = [];
    for (const [id] of this.tasks) {
      const task = this.getTask(id);
      if (task) result.push(task);
    }
    return result;
  }

  /** 按 textId 读取标题 Y.Text。 */
  getText(textId: string): Y.Text | undefined {
    return this.texts.get(textId);
  }

  /** 创建标题文本，返回 textId。 */
  createText(text?: string): string {
    const textId = id();
    const yText = new Y.Text(text);
    this.texts.set(textId, yText);
    return textId;
  }

  deleteText(textId: string): void {
    this.texts.delete(textId);
  }

  /** 读取 Event（带缓存）；不存在时清缓存并返回 undefined。 */
  getEvent(id: string): Event | undefined {
    const yMap = this.events.get(id);
    if (!yMap) {
      this.eventCache.delete(id);
      return undefined;
    }

    let event = this.eventCache.get(id);
    if (!event) {
      event = new Event(yMap, this);
      this.eventCache.set(id, event);
    }
    return event;
  }

  /** 事务中创建 Event 并写入所属 Task 的 events 列表。 */
  createEvent(taskId: string, start: number, end: number): Event {
    const eventId = id();

    this.doc.transact(() => {
      const eventYMap = new Y.Map();
      eventYMap.set("id", eventId);
      eventYMap.set("taskId", taskId);
      eventYMap.set("start", start);
      eventYMap.set("end", end);

      this.events.set(eventId, eventYMap);

      const taskYMap = this.tasks.get(taskId);
      if (taskYMap) {
        const eventsArray = taskYMap.get("events") as Y.Array<string>;
        eventsArray.push([eventId]);
      }
    });

    return this.getEvent(eventId)!;
  }

  /** 事务中从所属 Task 的 events 列表解除关联后删除自身。 */
  deleteEvent(id: string): void {
    const event = this.getEvent(id);
    if (!event) return;

    this.doc.transact(() => {
      const eventYMap = this.events.get(id);
      if (eventYMap) {
        const taskId = eventYMap.get("taskId");
        const taskYMap = this.tasks.get(taskId);
        if (taskYMap) {
          const eventsArr = taskYMap.get("events") as Y.Array<string>;
          const idx = eventsArr.toArray().indexOf(id);
          if (idx !== -1) eventsArr.delete(idx, 1);
        }

        this.events.delete(id);
        this.eventCache.delete(id);
      }
    });
  }

  /** 全部 Event；响应式——events 键集变化触发更新。 */
  get allEvents(): Event[] {
    this.subscribeEventsMap();
    const result: Event[] = [];
    for (const [id] of this.events) {
      const event = this.getEvent(id);
      if (event) result.push(event);
    }
    return result;
  }

  /**
   * 查询与给定时间范围 [from, to) 有重叠的所有事件。
   *
   * 使用标准区间重叠判断：event.start < to && event.end > from。
   * 这能正确捕获：
   * - start 在范围内的事件
   * - end 在范围内的事件
   * - 跨越整个范围的事件（start < from 且 end > to）
   * - 跨天事件的部分落在范围内的情况
   */
  queryEventsByRange(from: number, to: number): Event[] {
    this.subscribeEventsMap();
    const result: Event[] = [];
    for (const [id, yEvent] of this.events) {
      const start = yEvent.get("start") as number;
      const end = yEvent.get("end") as number;
      if (start < to && end > from) {
        const event = this.getEvent(id);
        if (event) result.push(event);
      }
    }
    return result;
  }

  /** 读取 Journal（带缓存）；不存在时清缓存并返回 undefined。 */
  getJournal(key: string): Journal | undefined {
    const yMap = this.journals.get(key);
    if (!yMap) {
      this.journalCache.delete(key);
      return undefined;
    }

    let journal = this.journalCache.get(key);
    if (!journal) {
      journal = new Journal(yMap, this);
      this.journalCache.set(key, journal);
    }
    return journal;
  }

  /** 按需获取/创建 Journal：不存在时新建容器 Task（标题为 text），再写入日志元数据。 */
  getOrCreateJournal(
    key: string,
    time: number,
    type: "WEEK" | "DAY",
    text: string,
  ): Journal {
    let journal = this.getJournal(key);
    if (journal) return journal;

    const task = this.createTask(text);

    this.doc.transact(() => {
      const journalYMap = new Y.Map();
      journalYMap.set("id", key);
      journalYMap.set("type", type);
      journalYMap.set("taskId", task.id);
      journalYMap.set("time", time);
      this.journals.set(key, journalYMap);
    });

    return this.getJournal(key)!;
  }

  /** user Map 中的根任务 ID。 */
  get rootTaskId(): string {
    return this.user.get("rootTaskId");
  }

  set rootTaskId(value: string) {
    this.user.set("rootTaskId", value);
  }

  /** 【遗留】缺失时自动建根的读法，与 UserManager.rootTask 重复；页面实际使用 db.userManager.rootTask。 */
  get rootTask(): Task | undefined {
    const rootTaskId = this.rootTaskId;
    if (!rootTaskId) {
      const task = this.createTask("ROOT");
      this.rootTaskId = task.id;
      return task;
    }
    return this.getTask(rootTaskId);
  }

  /** 清理缓存中已不存在于 Yjs 的条目（Database.import 重建数据后调用）。 */
  pruneCache(): void {
    for (const [id] of this.taskCache) {
      if (!this.tasks.has(id)) this.taskCache.delete(id);
    }
    for (const [id] of this.eventCache) {
      if (!this.events.has(id)) this.eventCache.delete(id);
    }
    for (const [id] of this.journalCache) {
      if (!this.journals.has(id)) this.journalCache.delete(id);
    }
  }
}
