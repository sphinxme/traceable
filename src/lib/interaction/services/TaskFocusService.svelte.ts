import type { Task } from "$lib/states/meta/task.svelte";
import { findAllOccurrences } from "$lib/components/graph/graph";
import { interactionBus, type FocusTarget } from "../eventbus.svelte";

/**
 * Week → Todo 方向的焦点服务。
 *
 * 当用户在周历中点击一个 Event 时，通过 {@link focusTask} 在已注册的视图森林中
 * 搜索目标任务的所有出现路径（DAG 多父节点感知），选定一条路径后通过
 * {@link interactionBus} 发射 `'focus:todo'` 事件。
 *
 * 消费者（`TodoFocusActions`）在 `onTodoReady`/`destroy` 生命周期中订阅该事件，
 * 匹配后委托执行展开 / 滚动 / 高亮。
 *
 * **设计要点：**
 * - 一次性聚焦命令通过 mitt 事件总线传递（fire-and-forget），无 `$state` 残留。
 * - 视图注册表 (`displayedViews`) 是持久查询状态，保留为普通 `Map`。
 * - DAG 搜索 + 循环定位逻辑不变，仅末尾由 `$state` 赋值改为 `emit`。
 * - 相同 task 重复点击时循环切换不同 occurrence（DAG 多路径）。
 * - `FocusTarget` 类型定义在 `eventbus.ts` 中（事件载荷的归属地）。
 */
export class TaskFocusService {
    /**
     * 视图注册表 — `Map<rootViewId, { panelId, rootTask }>`。
     *
     * 一个 rootViewId 涵盖 root 下整棵子树（多个 taskId）；
     * 一个 taskId 可能属于多个 rootViewId（DAG 多父节点）。
     *
     * 由 {@link registerView} / {@link unregisterView} 维护，
     * {@link focusTask} 在调用时快照遍历。
     */
    private displayedViews = new Map<
        string,
        { panelId: string; rootTask: Task }
    >();

    /**
     * 注册一个根视图，使其可被 {@link focusTask} 搜索到。
     *
     * 由 `TodoFocusActions.onTodoReady()` 在 root controller 挂载时调用。
     *
     * @param rootViewId 根视图的唯一标识（= `controller.viewId`）
     * @param panelId    所属面板 ID
     * @param rootTask   根任务（搜索的起点）
     */
    registerView(rootViewId: string, panelId: string, rootTask: Task): void {
        this.displayedViews.set(rootViewId, { panelId, rootTask });
    }

    /**
     * 注销一个根视图。
     *
     * 由 `TodoFocusActions.destroy()` 在 root controller 卸载时调用。
     *
     * @param rootViewId 要注销的根视图 ID
     */
    unregisterView(rootViewId: string): void {
        this.displayedViews.delete(rootViewId);
    }

    /**
     * 循环状态：当前正在循环的 taskId。
     * `null` 表示尚未开始循环或已切换到不同 task。
     */
    private cycleTaskId: string | null = null;

    /**
     * 循环状态：当前在 occurrences 列表中的索引。
     * 相同 task 重复点击时递增并取模，实现循环切换。
     */
    private cycleIndex = 0;

    /**
     * 数据驱动搜索 + 循环定位 + 事件发射。
     *
     * 1. 快照当前所有已注册视图
     * 2. 对每个视图构建 DAG 并搜索所有简单路径（root → target）
     * 3. 相同 task → index 递增循环；不同 task → reset
     * 4. 通过 {@link interactionBus} 发射 `'focus:todo'` 事件，
     *    由 `TodoFocusActions` 的监听器消费
     *
     * 如果目标在所有视图中均不可达，直接返回（不发射事件）。
     *
     * @param task 要聚焦的目标任务
     */
    focusTask(task: Task): void {
        const isSameTask = this.cycleTaskId === task.id;

        const roots = [...this.displayedViews.entries()].map(
            ([rootViewId, { panelId, rootTask }]) =>
                ({ rootViewId, panelId, rootTask }),
        );
        const occurrences = findAllOccurrences(roots, task);

        if (occurrences.length === 0) return;

        if (isSameTask) {
            this.cycleIndex = (this.cycleIndex + 1) % occurrences.length;
        } else {
            this.cycleTaskId = task.id;
            this.cycleIndex = 0;
        }

        const occ = occurrences[this.cycleIndex];
        const target: FocusTarget = {
            rootViewId: occ.rootViewId,
            path: occ.path,
            viewId: occ.viewId,
        };
        interactionBus.emit("focus:todo", target);
    }
}
