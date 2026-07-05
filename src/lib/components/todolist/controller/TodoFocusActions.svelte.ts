import { untrack } from "svelte";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import type { FocusTarget } from "$lib/interaction/services/TaskFocusService.svelte";

/**
 * Todo 焦点 Action — 管理与单个 TodoController 关联的焦点行为。
 *
 * **两大职责：**
 *
 * 1. **Cursor Focus（既有）** — 键盘导航 / 新建 Todo 后的光标恢复。
 *    通过 `onfocus` 回调（由 UI 组件赋值）将光标定位到编辑器指定位置。
 *    `focusBottom` / `focusNext` 在控制器树中递归导航。
 *
 * 2. **Week→Todo Highlight（新增）** — 当用户点击 Week Event 时，
 *    响应 {@link TaskFocusService.target} 变化，执行：
 *    - **Root controller**: 注册视图 + 沿路径展开祖先 (`handleRootFocusTarget`)
 *    - **Child controller**: 滚动到视图 + 金色闪烁高亮 (`handleFocusTarget`)
 *
 * **生命周期：**
 * - `onTodoReady()`: 消费待处理的 cursor focus + 注册 root 视图
 * - `destroy()`: 清理高亮定时器 + 注销 root 视图
 *
 * **$effect 约束：**
 * Svelte 5 的 `$effect` 只能在组件初始化阶段注册，不能在 `onTodoReady()`
 * （运行于 `$effect` 回调内）中嵌套调用。因此响应 `target` 变化的 `$effect`
 * 留在组件中作为薄包装，仅读取 `target` 并委托本类的 `handleXxx` 方法。
 */
export class TodoFocusActions implements TodoLifeCycle {
    constructor(
        public readonly host: TodoController
    ) { }

    // ═══════════════════════════════════════════════════════════
    //  Cursor Focus (键盘导航 / 新建 Todo 后光标恢复)
    // ═══════════════════════════════════════════════════════════

    /**
     * UI 组件挂载后将回调赋值到此字段。
     *
     * - 如果是 root → 由 `Title.svelte` 赋值
     * - 如果是 todo → 由 `TodoItem.svelte` 赋值
     *
     * @param cursorIndex 光标位置（可能为负值或特别大的值）
     * @returns `true` 表示成功 focus
     */
    public onfocus: (cursorIndex: number) => boolean = () => false;

    /**
     * 将焦点移动到当前 todo 子树的最后一个叶子节点。
     *
     * 1. 如果已折叠 → focus 自己
     * 2. 如果没有 child → focus 自己
     * 3. 否则递归调用最后一个 child 的 `focusBottom`
     *
     * @param cursorIndex 光标位置（每下降一层减 2）
     * @returns `true` 表示成功 focus
     */
    public focusBottom(cursorIndex: number): boolean {
        const isFolded = this.host.statesTree.isCurrentFolded();
        if (isFolded) {
            return this.onfocus(cursorIndex);
        }

        if (this.host.task.children.size === 0) {
            return this.onfocus(cursorIndex);
        }

        const lastChildIndex = this.host.task.children.size - 1;
        return this.host.childrenActions.getChildControllerByIndex(lastChildIndex).focusActions.focusBottom(cursorIndex - 2);
    }

    /**
     * 将焦点移动到自己的下一个平级兄弟。
     *
     * 如果自己已经是最后一个，则上浮到父级继续寻找。
     *
     * @param cursorIndex 光标位置（每上浮一层加 2）
     * @returns `true` 表示成功 focus
     */
    public focusNext(cursorIndex: number): boolean {
        if (!this.host.parentController) {
            return false;
        }

        const nextSlibingController = this.host.parentController.childrenActions.getChildNextSlibing(this.host.task.id);
        if (!nextSlibingController) {
            return this.host.parentController.focusActions.focusNext(cursorIndex + 2);
        }

        return nextSlibingController.focusActions.onfocus(cursorIndex);
    }

    // ═══════════════════════════════════════════════════════════
    //  Week→Todo Highlight (点击 Week Event → 高亮对应 Todo)
    // ═══════════════════════════════════════════════════════════

    /**
     * 由 `Todo.svelte` 赋值的滚动回调。
     *
     * Action 类不持有 DOM 引用，通过此回调委托组件执行 `scrollIntoView`。
     * 遵循既有 `onfocus` 回调模式。
     */
    public onScrollIntoView: () => void = () => {};

    /**
     * 高亮状态 — 由 `Todo.svelte` 模板读取以控制 `highlight-box` class。
     *
     * `true` 时显示金色闪烁覆盖层，3 秒后自动恢复 `false`。
     */
    public highlighting = $state(false);

    /** 高亮定时器引用，用于在 destroy / 重新高亮时清理 */
    private highlightTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * 处理焦点目标 — 由 `Todo.svelte` 的薄 `$effect` 调用。
     *
     * 精确匹配 `viewId` 后执行滚动 + 高亮。
     * 不匹配时直接返回，不做任何操作。
     *
     * @param target 当前焦点目标
     */
    handleFocusTarget(target: FocusTarget): void {
        if (target.viewId !== this.host.viewId) return;
        this.onScrollIntoView();
        this.startHighlight();
    }

    /**
     * 处理根焦点目标 — 由 `TodoView.svelte` 的薄 `$effect` 调用。
     *
     * 匹配 `rootViewId` 后沿路径展开祖先（使目标 Todo 可见）。
     * 使用 `untrack` 避免在展开过程中触发额外的响应式更新。
     * 不匹配时直接返回。
     *
     * @param target 当前焦点目标
     */
    handleRootFocusTarget(target: FocusTarget): void {
        if (target.rootViewId !== this.host.viewId) return;
        untrack(() => this.host.unfoldByPath(target.path));
    }

    /**
     * 启动高亮：设置 `highlighting = true` 并启动 3 秒定时器。
     *
     * 如果已有定时器在运行，先清除（支持快速连续高亮切换）。
     */
    private startHighlight(): void {
        this.highlighting = true;
        if (this.highlightTimer) clearTimeout(this.highlightTimer);
        this.highlightTimer = setTimeout(
            () => { this.highlighting = false; },
            3000,
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  生命周期
    // ═══════════════════════════════════════════════════════════

    /**
     * Todo 组件就绪后调用。
     *
     * 1. 消费待处理的 cursor focus 请求（键盘导航 / 新建 Todo）
     * 2. 如果是 root controller，注册视图到 `TaskFocusService`
     *    （使 `focusTask` 能搜索到此视图的子树）
     */
    public onTodoReady() {
        const cursorIndex = this.host.panel.interaction.cursor.consumeFocusInsert(this.host.viewId);
        if (cursorIndex !== undefined) {
            this.onfocus(cursorIndex);
        }

        if (this.host.isRoot()) {
            this.host.panel.interaction.taskFocus.registerView(
                this.host.viewId,
                this.host.panel.id,
                this.host.task,
            );
        }
    }

    /**
     * 清理资源 — 可重复调用。
     *
     * 1. 清理高亮定时器（防止组件卸载后定时器仍执行）
     * 2. 如果是 root controller，从 `TaskFocusService` 注销视图
     */
    public destroy() {
        if (this.highlightTimer) {
            clearTimeout(this.highlightTimer);
            this.highlightTimer = null;
        }

        if (this.host.isRoot()) {
            this.host.panel.interaction.taskFocus.unregisterView(
                this.host.viewId,
            );
        }
    }
}
