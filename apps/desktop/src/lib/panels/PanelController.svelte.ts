import type { Task } from "$lib/states/meta/task.svelte";
import type { Store } from "$lib/states/meta/store.svelte";
import { TodoController } from "../components/todolist/controller/TodoController.svelte";
import { makeViewIdByPaths } from "../components/todolist/controller/utils";
import type { TodoLifeCycle } from "../components/todolist/controller/ILifeCycle.svelte";
import { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
import { eventbus } from "../components/todolist/controller/eventbus.svelte";
import { tick } from "svelte";
import type { PanelController } from "../components/todolist/controller/IPanelController.svelte";
import {
  getInteractionContext,
  type InteractionContext,
} from "$lib/interaction/context.svelte";

/**
 * Todo 编辑器面板控制器 — 面板层与大纲组件层之间的桥梁。
 *
 * 职责：
 * - 维护面包屑导航栈 `currentPaths`，并经 `PanelStateStore` 持久化（Yjs，跨会话/设备）
 * - home 变更时销毁并重建根 `TodoController`（`$effect.pre`）
 * - 实现 `PanelController`（供 `TodoController` 缩放导航）与 `TodoLifeCycle`（挂载/销毁回调）
 * - 滚动位置记忆：视图挂载完成后恢复、滚动时保存（会话内）
 *
 * 由 `Editor.svelte` 构造并驱动生命周期回调；根 `TodoController` 的生命周期
 * 则由 `TodoView.svelte` 的 `$effect` 驱动。
 */
export class EditorPanelController implements TodoLifeCycle, PanelController {
  /**
   * 面包屑导航栈：`[rootTask, ..., 当前home]`，不允许为空。
   * 末项即当前页面的 home task —— 面包屑末项、页面标题、当前渲染的顶级节点的父节点。
   */
  public currentPaths: Task[];
  /** 当前 home 的根 `TodoController`，随导航栈末项由 `$effect.pre` 重建（首次运行前为 null）。 */
  public currentHomeController: TodoController;
  /** 是否位于根 home（导航栈仅剩 root）；此时编辑器不显示页面标题。 */
  public readonly isRootHome: boolean;
  /** 交互上下文（拖拽/光标/滚动记忆等服务），构造时取自 Svelte Context。 */
  public readonly interaction: InteractionContext;

  /**
   * @param id              面板唯一标识，参与 viewId 计算
   * @param panelStateStore 面板状态入口（导航路径 + 折叠状态树，Yjs 持久化）
   * @param rootTaskId      导航栈根任务 ID（面包屑第一项）
   * @param store           数据层入口，用于把持久化的路径 ID 还原为 Task
   */
  constructor(
    public readonly id: string,
    public readonly panelStateStore: PanelStateStore,
    public readonly rootTaskId: string,
    store: Store,
  ) {
    this.interaction = getInteractionContext();
    const paths = this.panelStateStore.getPaths();
    const initialPaths = paths
      .map((id) => store.getTask(id))
      .filter((task): task is Task => task !== undefined);

    this.currentPaths = $state(initialPaths);

    this.isRootHome = $derived(this.currentPaths.length === 1);
    this.currentHomeController = $state(null as unknown as TodoController); // 下面保证$effect.pre时一定会写入
    // 导航栈变更 → 销毁旧 home 的控制器树 → 以末项为新 home 创建根控制器（沿路径建折叠状态树）
    $effect.pre(() => {
      this.currentHomeController = TodoController.createRoot(
        this,
        this.currentPaths[this.currentPaths.length - 1],
        panelStateStore.createHomeByPaths(this.currentPaths),
      );
      return () => {
        if (this.currentHomeController) {
          this.currentHomeController.destroy();
        }
      };
    });
  }
  /**
   * 视图挂载完成后恢复当前 home 的滚动位置
   * （`ScrollMemoryService.editorPanel`，key = panelId + viewId）。
   * 由 `Editor.svelte` 在滚动接线完成后调用。
   */
  public onTodoReady() {
    const preScrollState =
      this.interaction.scroll.editorPanel[
        this.panelStateStore.panelId + this.currentHomeController.viewId
      ];
    if (preScrollState) {
      this.scrollTo?.(preScrollState.scrollTop, preScrollState.scrollLeft);
    }
  }

  /**
   * 空操作（有意为之）：导航路径已在每次变更时即时持久化（pushPaths/popTo 内调用 savePaths），
   * home 控制器由 `$effect.pre` 的 cleanup 销毁，此处无需善后。
   */
  public destroy() {
    console.debug("editor panel destroyed");
  }

  /** 将当前导航栈（Task ID 序列）持久化到 `PanelStateStore`。 */
  public savePaths() {
    this.panelStateStore.savePaths(this.currentPaths.map((x) => x.id));
  }

  /** 编辑器面板支持缩放导航。 */
  zoomable() {
    return true;
  }

  /**
   * 缩放退回到面包屑第 index 项：截断导航栈至 [0..index] 并以 View Transition 动画过渡，完成后持久化。
   * @param index 被点击的面包屑项下标
   */
  public async popTo(index: number) {
    if (index < 0) {
      throw new Error("当前路径中未找到对应的task");
    }

    await this.withZoomoutTransition(index, () => {
      // 截取前面index个
      this.currentPaths = this.currentPaths.slice(0, index + 1);
    });
    this.savePaths();
  }

  /**
   * 在 View Transition 中执行缩放退出，并协调动画命名与光标状态：
   *
   * 1. 计算 homeNextViewId —— 当前 home 在缩放结束后新树中的 viewId
   *    （以新 home 为根，沿 [index..末项] 逐级折叠哈希得到）
   * 2. 广播 `zoomout:beforeStart` → 当前根控制器把标题/列表的 viewTransitionName
   *    命名为该 viewId，与新树中对应节点配对，完成「页面 → 列表条目」形变
   * 3. `cursor.startZoomout` 标记缩放状态（供光标恢复）；
   *    `doZoomout` 在 `document.startViewTransition` 中执行实际的导航栈变更
   * 4. 过渡完成后广播 `zoomout:afterTransitioned`（清理命名）并 `cursor.endZoomout`
   *
   * TODO: 放到触发侧(breadcrumb/NavigatorController)
   */
  private async withZoomoutTransition(index: number, doZoomout: () => void) {
    const restPathIds = this.currentPaths.slice(index).map((x) => x.id);
    const homeNextViewId = makeViewIdByPaths(this.id, restPathIds);
    if (!homeNextViewId) {
      throw new Error("非法homeNextViewId");
    }

    eventbus.emit("zoomout:beforeStart", { homeNextViewId });
    this.interaction.cursor.startZoomout(homeNextViewId);
    await tick();
    const transition = document.startViewTransition(() => {
      doZoomout();
    });
    await transition.finished;
    eventbus.emit("zoomout:afterTransitioned", { homeNextViewId });
    this.interaction.cursor.endZoomout(homeNextViewId);
  }

  /**
   * 缩放进入时由 `TodoController.zoomInto` 调用：将子路径追加到导航栈并持久化。
   * 本方法不触发动画，由调用方（`withZoomIntoTransition`）负责。
   * @param childPaths 从当前 home 的子任务到目标任务（含）的路径，不含当前 home
   */
  public pushPaths(childPaths: Task[]) {
    this.currentPaths = [...this.currentPaths, ...childPaths];
    this.savePaths();
  }

  /** 滚动回调，由 `Editor.svelte` 注入；`onTodoReady` 依赖它恢复滚动位置。 */
  public scrollTo: ((top: number, left: number) => void) | undefined;

  /** 滚动时上报位置，存入 `ScrollMemoryService.editorPanel`（key = panelId + viewId）。 */
  public onScroll(top: number, left: number) {
    this.interaction.scroll.editorPanel[
      this.panelStateStore.panelId + this.currentHomeController.viewId
    ] = { scrollTop: top, scrollLeft: left };
  }
}
