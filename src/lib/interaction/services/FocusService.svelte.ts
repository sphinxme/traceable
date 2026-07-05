import type { Task } from "$lib/states/meta/task.svelte";
import { findAllOccurrences } from "$lib/components/graph/graph";

export class FocusService {
    // === Event-level (Todo→Week) ===

    public highlight: Record<string, boolean> = $state({});
    public focusing: Record<string, boolean> = $state({});

    // === Task-level (Week→Todo) ===

    /** Todo.svelte 用 controller.viewId 精确匹配 (区分同视图内不同路径) */
    public targetViewId: string | null = $state(null);

    /** TodoView 用 controller.viewId 匹配, 决定是否需要展开 */
    public targetRootViewId: string | null = $state(null);

    /** TodoView 用此路径展开祖先 */
    public targetPath: string[] | null = $state(null);

    /** 递增以重新触发 $effect */
    public focusNonce: number = $state(0);

    // === 视图注册表 ===
    // Map<rootViewId, { panelId, rootTask }>
    // 一个 rootViewId 涵盖 root 下整棵子树 (多个 taskId);
    // 一个 taskId 可能属于多个 rootViewId (DAG 多父节点)。
    private displayedViews = new Map<
        string,
        { panelId: string; rootTask: Task }
    >();

    registerView(rootViewId: string, panelId: string, rootTask: Task): void {
        this.displayedViews.set(rootViewId, { panelId, rootTask });
    }

    unregisterView(rootViewId: string): void {
        this.displayedViews.delete(rootViewId);
    }

    // === 循环状态 ===
    private cycleTaskId: string | null = null;
    private cycleIndex = 0;

    /**
     * 数据驱动搜索 + 循环定位。
     * 每次调用都重建 occurrences 列表 (处理视图挂载/卸载变化)。
     * 相同 task → index 递增循环; 不同 task → reset。
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
        this.targetRootViewId = occ.rootViewId;
        this.targetPath = occ.path;
        this.targetViewId = occ.viewId;
        this.focusNonce++;
    }
}
