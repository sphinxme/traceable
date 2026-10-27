import type { TodoLifeCycle } from "$lib/components/todolist/controller/ILifeCycle.svelte";
import type { PanelController } from "$lib/components/todolist/controller/IPanelController.svelte";
import { TodoController } from "$lib/components/todolist/controller/TodoController.svelte";
import type { Journal } from "$lib/states/meta/journal.svelte";
import type { Task } from "$lib/states/meta/task.svelte";
import type { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
import type { Store } from "$lib/states/meta/store.svelte";
import dayjs from "dayjs";
import { range } from "radash";
import {
  getInteractionContext,
  type InteractionContext,
} from "$lib/interaction/context.svelte";

/**
 * 日志面板控制器抽象基类 — 周日志 / 日日志面板共用。
 *
 * 与 `EditorPanelController` 的差异：日志面板纵向平铺多个 Journal，
 * 不支持缩放导航（`zoomable` 恒为 false，`pushPaths` 不可用）；
 * 每个 Journal 的容器 Task 各自创建独立的根 `TodoController`（getTodoController）。
 *
 * 生命周期回调（onTodoReady / destroy）为空实现。
 */
abstract class JournalPanelController
  implements TodoLifeCycle, PanelController
{
  /** 交互上下文，构造时取自 Svelte Context。 */
  public readonly interaction: InteractionContext;

  /**
   * @param id              面板唯一标识，参与 viewId 计算
   * @param panelStateStore 面板状态入口（折叠状态树，Yjs 持久化）
   * @param rootTaskId      日志面板不使用面包屑导航，仅用于初始化面板状态树
   * @param store           数据层入口
   */
  public constructor(
    public readonly id: string,
    public readonly panelStateStore: PanelStateStore,
    public readonly rootTaskId: string,
    public readonly store: Store,
  ) {
    this.interaction = getInteractionContext();
  }

  public onTodoReady() {}
  public destroy() {}

  /** 日志面板不支持缩放导航，调用即视为程序错误。 */
  pushPaths(childPaths: Task[]): void {
    throw new Error("Method not implemented.");
  }

  /** 日志面板不支持缩放导航。 */
  zoomable() {
    return false;
  }

  /** 当前时间窗口内的 Journal 列表；窗口内的容器 Task 按需创建并落库。 */
  public abstract getJournalList(): Journal[];

  /**
   * 为单个 Journal 的容器 Task 创建根 `TodoController`
   * （折叠状态挂到本面板状态树上，随 Yjs 持久化）。
   */
  public getTodoController(journal: Journal): TodoController {
    const task = journal.task;
    if (!task) {
      throw new Error("Journal task is undefined");
    }
    const homeStateTree = this.panelStateStore.createHomeByPaths([task]);
    return TodoController.createRoot(this, task, homeStateTree);
  }
}

/**
 * 周日志面板控制器 — 以「下周开始」为锚点取 ±7 周，共 15 个周日志，
 * 覆盖 6 周前 → 8 周后（当前周位于列表第 9 项）。
 */
export class WeeklyJournalPanelController extends JournalPanelController {
  public constructor(
    id: string,
    panelStateStore: PanelStateStore,
    rootTaskId: string,
    store: Store,
  ) {
    super(id, panelStateStore, rootTaskId, store);
  }

  public getJournalList(): Journal[] {
    return this.genTimes().map((time) => {
      return this.store.getOrCreateJournal(
        `${time.valueOf()}-WEEK`,
        time.valueOf(),
        "WEEK",
        time.format("MM/DD"),
      );
    });
  }

  /**
   * 生成时间窗口：锚点 = 下周开始，offset ∈ [-7, 7] 映射为 锚点 − offset，共 15 个时间点。
   *
   * 注意：当前返回顺序为 新→旧（最远未来在前），与预期的日志顺序（旧→新）相反，待修正。
   */
  private genTimes() {
    const start = dayjs().startOf("week").add(7, "day");
    return [...range(-7, 7)].map((offset) => start.subtract(offset, "week"));
  }
}

/**
 * 日日志面板控制器 — 预留，未接入路由。
 *
 * 时间窗口以「今天 + 7 天」为锚点取 ±7 天，实际覆盖 [今天 → 今天+14]，
 * 不含任何过去的日期，与周日志窗口（含 6 个过去周）不一致，待修正。
 */
export class DailyJournalPanelController extends JournalPanelController {
  public constructor(
    id: string,
    panelStateStore: PanelStateStore,
    rootTaskId: string,
    store: Store,
  ) {
    super(id, panelStateStore, rootTaskId, store);
  }

  public getJournalList(): Journal[] {
    return this.genTimes().map((time) => {
      return this.store.getOrCreateJournal(
        `${time.valueOf()}-DAY`,
        time.valueOf(),
        "DAY",
        time.format("MM/DD"),
      );
    });
  }

  /**
   * 生成时间窗口：锚点 = 今天 + 7 天，offset ∈ [-7, 7] 映射为 锚点 − offset，共 15 个时间点。
   *
   * 注意：窗口下界为今天（不含过去日期），且返回顺序为 新→旧，均待修正。
   */
  private genTimes() {
    const start = dayjs().startOf("day").add(7, "day");
    return [...range(-7, 7)].map((offset) => start.subtract(offset, "day"));
  }
}
