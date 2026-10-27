import * as Y from "yjs";
import type { Task } from "../meta/task.svelte";

/** 折叠状态树节点：`__folded__` → boolean，`{taskId}` → 子节点。 */
export type StateMap = Y.Map<boolean | StateMap>;

/**
 * 面板级状态入口：每个面板（panelId）对应一棵状态树，
 * 持久化于 Y.Doc 的 panelStates Map，跨会话/跨设备保持一致。
 *
 * Yjs 结构：
 * ```
 * panelStates (Y.Map)
 *   └── {panelId} (Y.Map)
 *         ├── __paths__: string[]    导航路径（Task ID，根 → 当前 home）
 *         └── {taskId} (Y.Map)       各任务的折叠子树，由 StateStore 管理
 *               ├── __folded__: boolean
 *               └── {childTaskId} …  递归
 * ```
 */
export class PanelStateStore {
  public readonly panelStatesTree: Y.Map<any>;

  private constructor(
    statesStore: Y.Map<any>,
    public readonly panelId: string,
    public readonly rootTaskId: string,
  ) {
    if (!statesStore.has(panelId)) {
      statesStore.set(panelId, new Y.Map());
    }
    this.panelStatesTree = statesStore.get(panelId);
  }

  /** 工厂方法：确保该 panel 的子树存在（初始 __paths__ = [rootTaskId]）并返回入口。 */
  public static getOrCreateFromParentYMap(
    statesStore: Y.Map<any>,
    panelId: string,
    rootTaskId: string,
  ) {
    if (!statesStore.has(panelId)) {
      statesStore.set(panelId, this.generateStateYMap(rootTaskId));
    }

    return new PanelStateStore(statesStore.get(panelId), panelId, rootTaskId);
  }

  private static generateStateYMap(rootTaskId: string) {
    const m = new Y.Map();
    m.set("__paths__", [rootTaskId]);
    return m;
  }

  /** 读取导航路径；缺失时回退 [rootTaskId]。 */
  public getPaths(): string[] {
    return this.panelStatesTree.get("__paths__") || [this.rootTaskId];
  }

  /** 保存导航路径。 */
  public savePaths(paths: string[]) {
    this.panelStatesTree.set("__paths__", paths);
  }

  /** 沿导航路径逐级创建/获取折叠子树，返回路径末端任务对应的 StateStore。 */
  public createHomeByPaths(paths: Task[]): StateStore {
    const subStatesTree = paths.reduce((stateTree, task) => {
      if (stateTree.has(task.id)) {
        return stateTree.get(task.id);
      }

      return stateTree.set(task.id, StateStore.generateTreeYMap());
    }, this.panelStatesTree);

    return new StateStore(subStatesTree, paths[paths.length - 1].id);
  }
}

/**
 * 单个 Task 条目的折叠状态节点，生命周期与挂载的 TodoController 绑定
 * （TodoController destroy 时必须调用 destroy()）。
 *
 * 两条读写通道：
 * - $folded：$state 镜像，供 UI 绑定；写入同步到 Yjs，远端变化经 observe 回写镜像
 * - isCurrentFolded()：直接读 Yjs 并懒初始化 __folded__，供键盘/焦点 Action 使用
 */
export class StateStore {
  public constructor(
    public readonly statesTree: Y.Map<any>,
    public readonly taskId: string,
  ) {
    if (!this.statesTree.has("__folded__")) {
      this.statesTree.set("__folded__", false);
    }
    this._folded = $state(this.statesTree.get("__folded__"));
    this.statesTree.observe(this.onFoldedChange);
  }

  private _folded: boolean;

  public get $folded() {
    return this._folded;
  }

  public set $folded(_folded: boolean) {
    if (_folded !== this._folded) {
      this.statesTree.set("__folded__", _folded);
    }
  }

  private onFoldedChange = () => {
    const currentFolded = this.statesTree.get("__folded__");
    if (currentFolded !== this._folded) {
      this._folded = currentFolded;
    }
  };

  public static generateTreeYMap() {
    const m = new Y.Map();
    m.set("__folded__", false);
    return m;
  }

  /** 解除 Yjs observe；可重复调用。 */
  public destroy() {
    this.statesTree.unobserve(this.onFoldedChange);
  }

  public isCurrentFolded() {
    let folded = this.statesTree.get("__folded__");
    if (folded == null) {
      folded = false;
      this.statesTree.set("__folded__", folded);
    }
    return folded;
  }

  public unfold() {
    this.$folded = false;
  }

  public fold() {
    this.$folded = true;
  }

  /** 获取子任务的 StateStore，不存在则懒创建。 */
  public getChild(taskId: string) {
    if (!this.statesTree) {
      console.error("error0");
    }
    let subState = this.statesTree.get(taskId);
    if (!subState) {
      subState = new Y.Map();
      subState.set("__folded__", false);
      this.statesTree.set(taskId, subState);
    }
    return new StateStore(subState, taskId);
  }

  /** 将 another 的子树克隆收编为本节点子节点，删除原位置并销毁原实例（拖拽/移动任务时迁移折叠状态）。 */
  public receiveChild(another: StateStore) {
    this.statesTree.set(another.taskId, another.statesTree.clone());
    if (another.statesTree.parent) {
      (another.statesTree.parent as Y.Map<any>).delete(another.taskId);
    }
    another.destroy();
    return this.getChild(another.taskId);
  }
}
