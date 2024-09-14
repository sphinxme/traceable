import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

type YTask = Y.Map<unknown>;
type YEvent = Y.Map<unknown>;

export class Database {
  doc: Y.Doc;
  tasks: Y.Map<YTask>;
  texts: Y.Map<Y.Text>; // id-Y.Text
  events: Y.Map<YEvent>;
  notes: Y.Map<Y.Text>;
  loading: boolean = false;
  provider?: IndexeddbPersistence;

  private static db?: Database;

  static getInstance(): Database {
    if (!Database.db) {
      Database.db = new Database();
    }
    return Database.db;
  }

  constructor() {
    this.doc = new Y.Doc();
    this.tasks = this.doc.getMap("tasks");
    this.texts = this.doc.getMap("texts");
    this.events = this.doc.getMap("events");
    this.notes = this.doc.getMap("notes");
  }

  async load() {
    return new Promise<void>((resolve, reject) => {
      this.provider = new IndexeddbPersistence("traceable", this.doc);
      this.provider.on("synced", () => {
        console.log("content from the database is loaded");
        // this.init();
        this.tasks = this.doc.getMap("tasks");
        this.texts = this.doc.getMap("texts");
        this.events = this.doc.getMap("events");
        this.notes = this.doc.getMap("notes");
        console.log(this.doc.toJSON());
        console.log(this.tasks.get("root")?.toJSON());

        resolve();
      });
      // this.init();
      // resolve();
    });
  }

  // utils
  genID() {
    return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  init() {
    tasks.forEach((task) => {
      this.createTask(task);
    });
    console.log("inited");
  }

  // tasks

  public changeTaskStatus(id: string, isCompleted: boolean) {
    if (!id) {
      throw new Error("empty id");
    }

    this.doc.transact(() => {
      const task = this.getTask(id);
      task.set("isCompleted", isCompleted);
      const events = task.get("events") as Y.Array<string>;
      events.forEach((eventId) => {
        const event = this.events.get(eventId);
        if (!event) {
          throw new Error(
            `failed getting event when completed task, task id:${id}, eventId:${eventId}`,
          );
        }
        event.set("isCompleted", isCompleted);
      });
    });
  }

  public createTask(t: Task): string {
    if (!t.id) {
      t.id = this.genID();
    }

    const yTask = new Y.Map();

    // id
    yTask.set("id", t.id);

    // text
    if (!t.textId) {
      t.textId = this.genID();
    }
    if (typeof t.text === "undefined") {
      t.text = t.textId;
    }
    this.texts.set(t.textId, new Y.Text(t.text));
    yTask.set("textId", t.textId);

    // note text
    if (typeof t.note != "string") {
      t.note = "";
    }
    if (typeof t.noteId != "string") {
      t.noteId = "note-" + t.id + "-" + this.genID();
    }
    this.notes.set(t.noteId, new Y.Text(t.note));
    yTask.set("noteId", t.noteId);

    // parentId
    const parentIds = new Y.Array<string>();
    parentIds.push(t.parentIds);
    yTask.set("parentIds", parentIds);

    // isCompleted
    yTask.set("isCompleted", t.isCompleted);

    // children
    t.children = t.children || [];
    const children = new Y.Array<string>();
    children.push(t.children);
    yTask.set("children", children);

    // events
    t.events = t.events || [];
    const events = new Y.Array<string>();
    events.push(t.events);
    yTask.set("events", events);

    this.tasks.set(t.id, yTask);

    return t.id;
  }

  public getOrCreateOrganzieTask(
    id: string,
    time: number,
    text: string,
  ): YTask {
    const task = this.tasks.get("id");
    if (task) {
      return task;
    }

    this.createTask({
      id: id,
      textId: "",
      text: text,
      parentIds: ["organize"],
      isCompleted: false,
    });

    return this.getTask(id);
  }

  public getTask(id: string) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`task not found, id:${id}`);
    }
    return task;
  }

  // 既从原父亲删除task, 也加入到现在的父亲
  public moveTask(
    id: string,
    fromParentId: string,
    fromIndex: number,
    toParentId: string,
    toIndex: number,
  ) {
    if (fromParentId == toParentId) {
      if (fromIndex == toIndex || fromIndex == toIndex - 1) {
        return;
      }
    }
    if (toParentId == id) {
      return;
    }

    // FIXME: 当要插入的id已经存在在toParentId的孩子里了的时候
    db.doc.transact((transaction) => {
      const thisTaskParent = this.getTaskParents(id);
      const originTaskChildren = this.getTaskChildren(fromParentId);
      const originParentIndex = thisTaskParent.toArray().indexOf(fromParentId);
      const toParentChildren = this.getTaskChildren(toParentId);

      originTaskChildren.delete(fromIndex);
      thisTaskParent.delete(originParentIndex);

      // 如果已经存在在toParent的孩子里面了 那就只改顺序不再move
      const existedIndex = toParentChildren.toArray().indexOf(id);
      if (existedIndex > -1) {
        if (existedIndex == toIndex || existedIndex == toIndex - 1) {
          return;
        }

        toParentChildren.insert(toIndex, [id]);
        if (toIndex > existedIndex) {
          toParentChildren.delete(existedIndex);
        } else {
          toParentChildren.delete(existedIndex + 1);
        }
        return;
      }

      // 如果原位置在目标位置之前，插入位置减1
      if ((fromParentId == toParentId) && (fromIndex < toIndex)) {
        toIndex--;
      }

      toParentChildren.insert(toIndex, [id]);
      thisTaskParent.push([toParentId]);
    });
  }

  public copyTask(id: string, toParentId: string, toIndex: number) {
    db.doc.transact((transaction) => {
      const taskParents = db.getTaskParents(id);
      const parentTaskChildren = db.getTaskChildren(toParentId);

      const existedIndex = parentTaskChildren.toArray().indexOf(id);
      if (existedIndex > -1) {
        // 如果已经存在在toParent的孩子里面了 那就只改顺序不再copy
        if (existedIndex == toIndex || existedIndex == toIndex - 1) {
          return;
        }

        parentTaskChildren.insert(toIndex, [id]);
        if (toIndex > existedIndex) {
          parentTaskChildren.delete(existedIndex);
        } else {
          parentTaskChildren.delete(existedIndex + 1);
        }
      } else {
        taskParents.push([toParentId]);
        parentTaskChildren.insert(toIndex, [id]);
      }
    });
  }

  public getTaskAllChildren(id: string, idSet: Set<string>) {
    idSet.add(id);

    db.getTaskChildren(id).forEach((child) => {
      this.getTaskAllChildren(child, idSet);
    });
  }

  /**
   * 只改child task侧, 不改parent的children列表
   * @param id
   * @param param1
   */
  public changeTaskParentId(
    id: string,
    { from, to }: { from?: string; to: string },
  ) {
    const task = this.getTask(id);
    const parentIds = task.get("parentIds") as Y.Array<string>;
    if (typeof from != "string") {
      // insert
      parentIds.push([to]);
    } else {
      // update
      let fromParentIndex = -1;
      parentIds.forEach((parentId, index) => {
        if (parentId === from) {
          fromParentIndex = index;
        }
      });
      parentIds.delete(fromParentIndex);
      parentIds.push([to]);
    }
  }

  public getTaskEvents(id: string) {
    return this.getTask(id).get("events") as Y.Array<string>;
  }

  public getTaskChildren(id: string) {
    const children = this.getTask(id).get("children") as Y.Array<string>;
    if (!(children instanceof Y.Array)) {
      throw new Error(`children not ok, task id:${id}`);
    }
    return children;
  }

  public getTaskParents(id: string) {
    const parents = this.getTask(id).get("parentIds") as Y.Array<string>;
    if (!(parents instanceof Y.Array)) {
      throw new Error(`parents not ok, task id:${id}`);
    }
    return parents;
  }

  public getTaskText(id: string) {
    const textId = this.getTask(id).get("textId") as string;
    if (!(typeof textId === "string")) {
      throw new Error(`textId not ok, task id:${id}, textId:${textId}`);
    }
    return this.getText(textId);
  }

  public getTaskNoteText(id: string) {
    const textId = this.getTask(id).get("noteId") as string;
    if (!(typeof textId === "string")) {
      throw new Error(`note textId not ok, task id:${id}, textId:${textId}`);
    }
    return this.getNoteText(textId);
  }

  /**
   * 从指定树的位置删除这个task,
   * - 如果这个task只挂在这个树上, 那就把整体都删掉
   * - 如果这个task不仅挂在这个树上, 还在别的地方存在, 那就只删除它跟父节点的关系, 本体仍保留着
   * @param id
   * @param parentId
   */
  public deleteTaskFromParent(id: string, parentId: string) {
    const task = this.getTask(id);

    const parentIds = task.get("parentIds") as Y.Array<string>;
    if (parentIds.length == 1) {
      // 1. 如果是只挂在这个父亲上 就删掉本体的所有内容
      this.deleteTask(id);
    } else {
      // 2. 如果还挂在别的地方, 就只改成不再挂在这里

      const parentTaskChildren = this.getTaskChildren(parentId);
      // 找到自己是这个父亲的第几个孩子
      let myIndexInParent = -1;
      parentTaskChildren.forEach((childTaskId, indexInArr) => {
        if (childTaskId == id) {
          myIndexInParent = indexInArr;
        }
      });
      parentTaskChildren.delete(myIndexInParent);
    }
  }

  /**
   * 将会在所有parent当中删除这个task
   * @param id
   */
  public deleteTask(id: string) {
    // 0. 删除自己在父亲的位置
    // 1. 删除本体
    // 2. 删除所有子task
    // 3. 删除关联的yText
    // 4. 删除所有关联的events
    // 5. todo: 删除关联的schedule

    const task = this.getTask(id);
    const parentIds = task.get("parentIds") as Y.Array<string>;
    const allParentChildrenLists = parentIds.map((parentId) => {
      return this.getTaskChildren(parentId);
    });
    // const parentTaskChildren = this.getTaskChildren(parentIds);
    const childrenTaskIds = task.get("children") as Y.Array<string>;
    const textId = task.get("textId") as string;
    const eventIds = task.get("events") as Y.Array<string>;

    this.doc.transact((transaction) => {
      let myIndexInParent = -1;

      // 对于每个父亲, 都把自己从他们的孩子列表里删除
      allParentChildrenLists.forEach((parentTaskChildren) => {
        // 找到自己是这个父亲的第几个孩子
        parentTaskChildren.forEach((childTaskId, indexInArr) => {
          if (childTaskId == id) {
            myIndexInParent = indexInArr;
          }
        });
        parentTaskChildren.delete(myIndexInParent);
      });
      this.texts.delete(textId);

      // TODO:改成专门删除event的函数, 因为可以复用, 而且还需要处理删除schedule的逻辑
      eventIds.forEach((eventId) => {
        this.events.delete(eventId);
      });
      this.tasks.delete(id);
      childrenTaskIds.forEach((childTaskId) => {
        this.deleteTaskFromParent(childTaskId, id);
      });
    });
  }

  // texts

  public getText(id: string) {
    const text = this.texts.get(id);
    if (!text) {
      throw new Error(`get text failed, text id:${id}`);
    }
    return text;
  }

  // note texts
  public getNoteText(id: string) {
    const text = this.notes.get(id);
    if (!text) {
      throw new Error(`get note text failed, text id:${id}`);
    }
    return text;
  }

  // events

  public genEventId() {
    return `event-${db.genID()}`;
  }

  public createEvent(e: Event, source: string) {
    if (!e.taskId) {
      throw new Error("failed creating events: empty taskId");
    }

    if (!e.id) {
      throw new Error("empty event id");
    }

    const yEvent = EventToYEvent(e);
    this.doc.transact((transaction) => {
      transaction.meta.set("traceable::source", source);
      // task里加进去
      const task = this.getTask(e.taskId);
      const yEvents = task.get("events") as Y.Array<string>;
      // 创建对应的event
      this.events.set(e.id, yEvent);

      yEvents.push([e.id]);
      console.log(`task child event pushed, id:${e.id}`);
    });
  }

  /**
   * 不保证和task关联的一致性
   * @param eventId
   * @param e
   * @param source
   */
  public updateEvent(eventId: string, e: Event, source: string) {
    if (!eventId) {
      throw new Error("invalid event id");
    }
    e.id = eventId;
    let yEvent = this.events.get(eventId);
    if (!yEvent) {
      throw new Error(`no event by id: ${eventId}`);
    }
    this.doc.transact((transaction) => {
      transaction.meta.set("traceable::source", source);
      SetEventToYEvent(e, yEvent);
      console.log(`event updated, id:${e.id}`);
    });
  }

  /**
   * 1. 删除事件本体
   * 2. 从task当中删除本体id
   * 3. TODO: 删除schedule
   * @param eventId
   */
  public deleteEvent(eventId: string) {
    const yEvent = db.events.get(eventId);
    if (!yEvent) {
      throw new Error(`no event found by id: ${eventId}`);
    }
    const taskId = yEvent.get("taskId") as string;

    const events = db.getTaskEvents(taskId);
    events.delete(events.toArray().findIndex((v) => v == eventId));
    db.events.delete(eventId);
    yEvent.clear();
  }

  public observeEvent(
    eventId: string,
    callback: (e: Event) => void,
  ): () => void {
    const yEvent = this.events.get(eventId);
    if (!yEvent) {
      throw new Error(`failed getting event, id: ${eventId}`);
    }
    const warppedCallback = (
      e: Y.YMapEvent<unknown>,
      transaction: Y.Transaction,
    ) => {
      const updatedEvent: Event = yEventToEvent(e.target);
      callback(updatedEvent);
    };
    yEvent.observe(warppedCallback);
    return () => {
      yEvent.unobserve(warppedCallback);
    };
  }

  public getEventData(eventId: string): Event {
    const yEvent = this.events.get(eventId);
    if (!yEvent) {
      throw new Error(`failed getting yEvent by id, id: ${eventId}`);
    }
    return yEventToEvent(yEvent);
  }
}

function yEventToEvent(yEvent: YEvent): Event {
  const e: Event = {
    id: yEvent.get("id") as string,
    taskId: yEvent.get("taskId") as string,
    start: yEvent.get("start") as number,
    end: yEvent.get("end") as number,
    isAllDay: yEvent.get("isAllDay") as boolean,
    isCompleted: yEvent.get("isCompleted") as boolean,
  };
  const repeatScheduleId = yEvent.get("repeatScheduleId");
  if (typeof repeatScheduleId == "string") {
    e.repeatScheduleId = repeatScheduleId;
  }
  return e;
}

function EventToYEvent(event: Event): YEvent {
  const yEvent = new Y.Map();
  return SetEventToYEvent(event, yEvent);
}

function SetEventToYEvent(event: Event, yEvent: YEvent): YEvent {
  yEvent.set("id", event.id);
  yEvent.set("taskId", event.taskId);
  yEvent.set("start", event.start);
  yEvent.set("end", event.end);
  yEvent.set("isAllDay", event.isAllDay);
  yEvent.set("isCompleted", event.isCompleted);
  if (typeof event.repeatScheduleId == "string") {
    yEvent.set("repeatScheduleId", event.repeatScheduleId);
  }

  return yEvent;
}

export interface Task {
  id: string;
  textId: string;
  text?: string;
  parentIds: string[]; // 'none'或''空字符串时是root 仅yjs里有
  children?: string[]; // 里面放的是子task id
  events?: string[]; // 放Event的id
  noteId?: string;
  note?: string;
  isCompleted: boolean;
}

export interface Event {
  id: string;
  taskId: string;
  repeatScheduleId?: string;
  start: number;
  end: number;
  isAllDay: boolean;
  isCompleted: boolean;
}

// 1. 当用户界面触发的时候, 先把该算的算了: 1. 未结束的 2.
// 每次固定算一批, 如果算完了就不算了
// 如果没算完 记录这次算到哪了lastUpdatePosition, 下一次启动的时候继续算一次
interface RepeatSchedule { // 只展示最近前后五次的时间
  startTime: number;
  endType: "byTimes" | "byEndDate" | "endless";
  endTimes: number; // 重复多少次
  endTime: number; // 毫秒时间戳 到什么时候为止

  lastUpdatePosition: number; // 毫秒时间戳上一次更新截止到xxx时候(不包括这个时候), 下一次从这里开始计算 // 如果是-1就代表已经算完了不用再看了

  // 每5天
  // 每6天
  repeatPattern: string; // 以下
  // 1. 固定周期 : 跳过双休日, 跳过节假日
  //    - byYearDay  每年的第几天: 每年的第100天
  //    - byYearMonthDay 每年第几月的第几天: 每年4月1日
  //    - byYearMonthWeekDay (后面做) 每年第几月的第几个星期几: 每年4月的第三个星期一
  //    - byMonthDay 每月的第几天: 每月5日
  //    - byMonthWeekDay 每月的第几个星期几(后面做): 每月的第一个星期二
  //    - byWeekyDay 每周的第几天: 每周一
  //    - byDay 每天
  // 2. 每隔固定间隔的天数(工作日): 包含双休日? 包含节假日? (一般只有每隔特定天数才要这个, 每双月是肯定不需要这个的)
  repeatParams: any;
}

const tasks: Task[] = [
  {
    id: "root",
    textId: "doc-root",
    parentIds: [""],
    children: [
      "t1",
      "t2",
      "t3",
    ],
    isCompleted: false,
  },
  {
    id: "t1",
    textId: "doc-1",
    parentIds: ["root"],
    children: [
      "t1-1",
      "t1-2",
      "t1-3",
    ],
    isCompleted: false,
  },
  {
    id: "t2",
    parentIds: ["root"],
    textId: "doc-2",
    isCompleted: true,
  },
  {
    id: "t3",
    parentIds: ["root"],
    textId: "doc-3",
    isCompleted: false,
  },

  // children
  {
    id: "t1-1",
    parentIds: ["t1"],
    textId: "doc-1-1",
    isCompleted: false,
  },
  {
    id: "t1-2",
    parentIds: ["t1"],
    textId: "doc-1-2",
    isCompleted: false,
    children: [
      "t1-2-1",
      "t1-2-2",
      "t1-2-3",
    ],
  },
  {
    id: "t1-3",
    parentIds: ["t1"],
    textId: "doc-1-3",
    isCompleted: false,
  },

  // cchildren
  {
    id: "t1-2-1",
    parentIds: ["t1-2"],
    textId: "doc-1-2-1",
    isCompleted: false,
  },
  {
    id: "t1-2-2",
    parentIds: ["t1-2"],
    textId: "doc-1-2-2",
    isCompleted: false,
  },
  {
    id: "t1-2-3",
    parentIds: ["t1-2"],
    textId: "doc-1-2-3",
    isCompleted: false,
  },
];

export const db = Database.getInstance();
