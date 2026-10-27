import * as Y from "yjs";
import type { Store } from "./store.svelte";
import { createYMapSubscriber } from "./reactive-yjs";

/**
 * Event：日历上的时间块，与 Task 多对一（taskId 关联，反向列表为 Task.events）。
 *
 * Yjs 结构（Y.Map）：id / taskId / start / end（毫秒时间戳）。
 * 经 Store.createEvent 或 Task.insertEvent 创建，创建时同步写入 Task.events。
 */
export class Event {
  readonly yMap: Y.Map<any>;
  private readonly store: Store;
  private readonly subscribe: () => void;

  readonly id: string;
  readonly taskId: string;

  constructor(yMap: Y.Map<any>, store: Store) {
    this.yMap = yMap;
    this.store = store;
    this.subscribe = createYMapSubscriber(yMap);

    this.id = this.yMap.get("id");
    this.taskId = this.yMap.get("taskId");
  }

  get start(): number {
    this.subscribe();
    return this.yMap.get("start");
  }

  set start(value: number) {
    this.yMap.set("start", value);
  }

  get end(): number {
    this.subscribe();
    return this.yMap.get("end");
  }

  set end(value: number) {
    if (value === this.end) return;
    this.yMap.set("end", value);
  }

  /** 关联的 Task；taskId 悬空（任务已删）时抛错。 */
  get task() {
    const task = this.store.getTask(this.taskId);
    if (!task) {
      throw new Error(`invalid taskId: ${this.taskId} from event:${this.id}`);
    }
    return task;
  }

  /** 时长（毫秒）。 */
  get duration(): number {
    this.subscribe();
    return this.end - this.start;
  }

  /** 事务中同时设置起止时间。 */
  setPeriod(start: number, end: number) {
    this.store.doc.transact(() => {
      this.start = start;
      this.end = end;
    });
  }

  /** 保持时长不变，平移到新的起始时间。 */
  moveTo(start: number) {
    if (start === this.start) return;
    const duration = this.end - this.start;
    this.setPeriod(start, start + duration);
  }

  /** 调整时长（修改 end）。 */
  resizeTo(duration: number) {
    const newEnd = this.start + duration;
    this.end = newEnd;
  }

  /** 事务中先从所属 Task 的 events 列表解除关联，再删除自身。 */
  delete() {
    this.store.doc.transact(() => {
      const taskId = this.taskId;
      if (taskId) {
        const task = this.store.getTask(taskId);
        if (task) {
          task.detachEvent(this.id);
        }
      }
      this.store.deleteEvent(this.id);
    });
  }
}
