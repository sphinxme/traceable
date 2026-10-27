import dayjs, { Dayjs } from "dayjs";
import * as Y from "yjs";
import type { Store } from "./store.svelte";
import type { Task } from "./task.svelte";
import { createYMapSubscriber } from "./reactive-yjs";

/** 日志类型：周日志 / 日日志。 */
export type JournalType = "WEEK" | "DAY";

/**
 * Journal：按周/日组织的 Task 容器，本质是 Task + 时间/类型元数据，
 * 由 Store.getOrCreateJournal 按需创建（容器 Task 的标题即日志标题）。
 *
 * Yjs 结构（Y.Map）：id（= `${毫秒时间戳}-${type}`，见 genKey）、type、taskId、time（毫秒时间戳）。
 */
export class Journal {
  readonly yMap: Y.Map<any>;
  private readonly store: Store;
  private readonly subscribe: () => void;

  readonly id: string;
  readonly taskId: string;
  readonly task: Task;
  readonly type: JournalType;

  constructor(yMap: Y.Map<any>, store: Store) {
    this.yMap = yMap;
    this.store = store;
    this.subscribe = createYMapSubscriber(yMap);

    this.id = this.yMap.get("id");
    this.taskId = this.yMap.get("taskId");
    this.task = this.store.getTask(this.taskId)!;
    this.type = this.yMap.get("type");
  }

  /** 日志时间（Dayjs），响应式读取。 */
  get time(): Dayjs {
    this.subscribe();
    return dayjs(this.yMap.get("time") as number);
  }

  /** Journal 主键生成规则：`${毫秒时间戳}-${type}`。 */
  static genKey(time: Dayjs, type: JournalType): string {
    return `${time.valueOf()}-${type}`;
  }

  /** 序列化（time 为毫秒时间戳）。 */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      taskId: this.taskId,
      time: this.time.valueOf(),
    };
  }
}
