import type { Task } from "$lib/states/meta/task.svelte";
import { findAllOccurrences } from "$lib/components/graph/graph";

/**
 * 焦点目标 — 描述一次 "点击 Week Event → 定位 Todo" 的结果。
 *
 * 每次 {@link TaskFocusService.focusTask} 赋**新对象**到 `$state`，
 * 引用变化天然触发所有消费者的 `$effect`，无需额外的 nonce 字段。
 */
export interface FocusTarget {
    /** 目标所在的根视图 ID (用于 TodoView 匹配并展开祖先) */
    rootViewId: string;
    /** 从根任务到目标任务的 taskId 路径 (root → target) */
    path: string[];
    /** 目标 Todo 的精确 viewId (用于 Todo.svelte 精确匹配) */
    viewId: string;
}

/**
 * Week → Todo 方向的焦点服务。
 *
 * 当用户在周历中点击一个 Event 时，通过 {@link focusTask} 在已注册的视图森林中
 * 搜索目标任务的所有出现路径（DAG 多父节点感知），选定一条路径后设置
 * {@link target} 为新的 {@link FocusTarget} 对象。
 *
 * 消费者（TodoView / Todo）通过薄 `$effect` 读取 `target` 并委托
 * `TodoFocusActions` 执行展开 / 滚动 / 高亮。
 *
 * **设计要点：**
 * - `target` 是单一 `$state<FocusTarget | null>`，替代旧方案中分散的
 *   `targetViewId` + `targetRootViewId` + `targetPath` + `focusNonce`。
 * - 每次赋新对象，即使字段值相同也会触发 `$effect`（引用变化）。
 * - 相同 task 重复点击时循环切换不同 occurrence（DAG 多路径）。
 */
export class TaskFocusService {
    /**
     * 当前焦点目标。
     *
     * - `null` 表示无焦点。
     * - 非 `null` 时，消费者应匹配 `viewId` / `rootViewId` 决定是否响应。
     * - 每次 {@link focusTask} 赋新对象 → 引用变化 → `$effect` 自动重触发。
     */
    public target = $state<FocusTarget | null>(null);

    /**
     * 视图注册表 — Map<rootViewId, { panelId, rootTask }>。
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
     * 数据驱动搜索 + 循环定位。
     *
     * 1. 快照当前所有已注册视图
     * 2. 对每个视图构建 DAG 并搜索所有简单路径（root → target）
     * 3. 相同 task → index 递增循环；不同 task → reset
     * 4. 赋新 {@link FocusTarget} 对象到 `target`，触发消费者 `$effect`
     *
     * 如果目标在所有视图中均不可达，直接返回（不修改 `target`）。
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
        this.target = {
            rootViewId: occ.rootViewId,
            path: occ.path,
            viewId: occ.viewId,
        };
    }
}
