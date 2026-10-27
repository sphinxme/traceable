import * as Y from "yjs";
import type { Store } from "./store.svelte";

/**
 * 用户级数据管理（当前仅 rootTaskId）：构造时确保根任务存在，
 * 缺失则自动创建标题为 "ROOT" 的任务。
 *
 * 注意：rootTaskId 是构造时的快照（readonly），之后 user Map 的变化
 * （如 Database.import 导入他机数据换根）不会反映到本实例。
 */
export class UserManager {
  public readonly rootTaskId: string;

  constructor(
    private yMap: Y.Map<any>,
    private store: Store,
  ) {
    this.rootTaskId = this.yMap.get("rootTaskId");
    if (!this.rootTaskId) {
      const task = this.store.createTask("ROOT");
      this.rootTaskId = task.id;
      this.yMap.set("rootTaskId", task.id);
    }
  }

  /** 根任务；rootTaskId 对应的任务已被删除时为 undefined。 */
  get rootTask() {
    return this.store.getTask(this.rootTaskId);
  }
}
