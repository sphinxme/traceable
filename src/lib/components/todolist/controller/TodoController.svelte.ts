
import type { Task } from "$lib/states/meta/task.svelte";
import { TodoFocusActions } from "./TodoFocusActions.svelte";
import { TodoKeyboardActions } from "./TodoKeyboardActions.svelte";
import { TodoTransitionActions } from "./TodoTransitionActions.svelte";
import { TodoChildrenActions } from "./TodoChildrenActions.svelte";
import { StateStore } from "$lib/states/states/StatesTree.svelte";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import { makeViewId } from "./utils";
import { DragDropActions } from "./DragDropActions.svelte";
import type { PanelController } from "./IPanelController.svelte";
import { eventbus, type Events } from "./eventbus.svelte";


/**
 * Todo 主控制器 — 与每个 Todo 实例一一对应。
 *
 * 控制器树与组件树同构：
 * - `TodoView.svelte`（面板根）对应一个 root `TodoController`
 * - `Todo.svelte`（子条目）对应一个 child `TodoController`，由父控制器的 `makeChild()` 创建
 *
 * 控制器持有所有业务逻辑，组件只负责渲染和委托。
 * 交互逻辑被拆分到 5 个 Action 处理器中，各自实现 `TodoLifeCycle`。
 *
 * @example
 * ```ts
 * // 面板根控制器
 * const root = TodoController.createRoot(panel, task, statesTree);
 * // 子控制器（由 Todo.svelte 调用）
 * const child = parentController.makeChild(task);
 * ```
 */
export class TodoController implements TodoLifeCycle {

    // focus注册&触发
    /** 焦点操作处理器（光标恢复 + Week→Todo 高亮） */
    public readonly focusActions: TodoFocusActions;
    /** 键盘操作处理器（导航 / Tab / Enter / Shift+Enter） */
    public readonly keyboardActions: TodoKeyboardActions;
    /** 缩放过渡处理器（View Transition 动画命名与协调） */
    public readonly transitionActions: TodoTransitionActions;
    /** 子任务查询处理器（兄弟节点 / 索引查找） */
    public readonly childrenActions: TodoChildrenActions;
    /** 拖放操作处理器（drag / drop / 环检测） */
    public readonly dragDropActions: DragDropActions;

    /** 笔记编辑器（Popover）开关状态 */
    public noteEditOpen = $state(false);

    /**
     * @param depth 嵌套深度（root = 0）
     * @param task 关联的数据实体
     * @param panel 所属面板控制器
     * @param viewId 唯一视图标识（由 `makeViewId` 生成）
     * @param statesTree 折叠状态存储（Yjs 持久化）
     * @param parentController 父控制器（root 为 undefined）
     */
    private constructor(
        public readonly depth: number,
        public readonly task: Task,
        public readonly panel: PanelController,
        public readonly viewId: string,
        public readonly statesTree: StateStore,
        public readonly parentController?: TodoController,
    ) {
        this.focusActions = new TodoFocusActions(this);
        this.keyboardActions = new TodoKeyboardActions(this);
        this.transitionActions = new TodoTransitionActions(this);
        this.childrenActions = new TodoChildrenActions(this);
        this.dragDropActions = new DragDropActions(this);
    }

    // protected itemQuillEditor: Quill | undefined;
    // protected noteQuillEditor: Quill | undefined;

    /**
     * 创建面板根控制器。
     *
     * 由 `EditorPanelController` 在 `$effect.pre` 中调用，
     * 每次缩放导航都会销毁旧 root 并创建新 root。
     *
     * @param panel 面板控制器
     * @param task 根任务
     * @param statesTree 根折叠状态存储
     * @returns root TodoController（depth=0, 无 parentController）
     */
    public static createRoot(panel: PanelController, task: Task, statesTree: StateStore) {
        return new TodoController(0, task, panel, makeViewId(panel.id, task.id), statesTree);
    }

    /**
     * 创建子控制器并注册到 `childrenControllers`。
     *
     * 由 `Todo.svelte` 在组件初始化时调用：
     * ```ts
     * const controller = parentController.makeChild(task);
     * ```
     *
     * @param task 子任务实体
     * @returns 新的子 TodoController（depth = parent.depth + 1）
     */
    public makeChild(task: Task) {
        const childController = new TodoController(
            this.depth + 1,
            task,
            this.panel,
            this.calculateChildViewId(task.id),
            this.statesTree.getChild(task.id),
            this,
        );

        this.childrenControllers.set(task.id, childController);
        return childController;
    }

    /**
     * Todo 组件就绪后调用 — 依次初始化所有 Action。
     *
     * 由 `Todo.svelte` / `TodoView.svelte` 中的 `$effect` 驱动：
     * ```ts
     * $effect(() => {
     *     controller.onTodoReady();
     *     return () => controller.destroy();
     * });
     * ```
     */
    public onTodoReady() {
        this.focusActions.onTodoReady();
        this.keyboardActions.onTodoReady();
        this.transitionActions.onTodoReady();
        this.childrenActions.onTodoReady();
        this.dragDropActions.onTodoReady();
    }

    /**
     * 销毁控制器 — 可重复调用。
     *
     * 1. 从父控制器的 `childrenControllers` 中删除自身
     * 2. 依次销毁所有 Action
     * 3. 销毁 `StateStore`
     */
    public destroy() {
        if (this.parentController) {
            this.parentController.childrenControllers.delete(this.task.id);
        }
        // this.childrenControllers.forEach((childController) => {
        //     childController.destroy();
        // })

        this.focusActions.destroy();
        this.keyboardActions.destroy();
        this.transitionActions.destroy();
        this.childrenActions.destroy();
        this.dragDropActions.destroy();
        this.statesTree.destroy();

    }
    /** 子控制器映射表：taskId → TodoController */
    public readonly childrenControllers: Map<string, TodoController> = new Map();


    /**
     * 缩放进入当前 Task — 将路径推入面板导航栈并触发 View Transition 动画。
     *
     * 流程：
     * 1. 获取从 root 到当前 task 的路径（不含当前 home task）
     * 2. `transitionActions.withZoomIntoTransition` 设置动画名称
     * 3. `panel.pushPaths(subpaths)` 更新面包屑导航
     * 4. `$effect.pre` 销毁旧 root 控制器树，创建新 root
     */
    public async zoomInto() {
        if (!this.panel.zoomable()) {
            return;
        }

        let subpaths = this.getCurrentPaths();
        subpaths.shift()// 不能包含当前home task

        await this.transitionActions.withZoomIntoTransition(() => {
            this.panel.pushPaths(subpaths);
        })
    }

    /**
     * 删除自身 — 从父任务的 children 中移除并销毁控制器。
     *
     * @todo 当前未完成实现（末尾抛出 `not implemented`）
     */
    public deleteMyself() {
        // parent.deleteChild(task)
        this.parentController?.task.deleteChild(this.task);
        this.destroy();
        throw new Error("not implemented");
    }

    /**
     * 接收一个外部 TodoController 作为自己的子任务（用于 Tab 缩进 / 拖放 reparenting）。
     *
     * 1. 迁移折叠状态：`statesTree.receiveChild`
     * 2. 先 attach：`this.task.attachChild(anotherTask.task, index)`
     * 3. 再 detach：`anotherTask.parentController.task.detachChild(anotherTask.task)`
     *
     * @param anotherTask 要接收的 TodoController
     * @param index 插入位置（可选）
     */
    public receiveChild(anotherTask: TodoController, index?: number) {
        // 1. state先挪过去
        this.statesTree.receiveChild(anotherTask.statesTree);
        // 2. 先attach再删除
        this.task.attachChild(anotherTask.task, index);
        anotherTask.parentController?.task?.detachChild(anotherTask.task);
    }

    /**
     * 计算子任务的 viewId。
     *
     * @param childTaskId 子任务 ID
     * @returns `makeViewId(panelId, childTaskId, this.viewId)`
     */
    public calculateChildViewId(childTaskId: string) {
        return makeViewId(this.panel.id, childTaskId, this.viewId);
    }

    private _rootTaskId: string | undefined;
    /** 当前控制器树所属的根任务 ID（沿 parentController 向上查找） */
    get rootTaskId(): string {
        if (this._rootTaskId) return this._rootTaskId;
        this._rootTaskId = this.parentController
            ? this.parentController.rootTaskId
            : this.task.id;
        return this._rootTaskId;
    }

    /**
     * 沿路径展开所有祖先 — 用于 Week→Todo 焦点定位时使目标可见。
     *
     * @param path taskId 路径数组，`path[0]` = root taskId，`path[last]` = target taskId
     */
    unfoldByPath(path: string[]): void {
        let current = this.statesTree;
        for (let i = 0; i < path.length - 1; i++) {
            current.$folded = false;
            current = current.getChild(path[i + 1]);
        }
    }

    /**
     * 是否为面板根控制器（此时 TodoItem 渲染为标题 Title）。
     *
     * 类型收窄：`this is TodoController & { parentController: undefined }`
     */
    public isRoot(): this is TodoController & { parentController: undefined; } {
        return !this.parentController;
    }

    /**
     * 是否为第一层条目（parent 是 root）。
     *
     * 类型收窄：`this is TodoController & { parentController: TodoController & { parentController: undefined } }`
     */
    public isTopItem(): this is TodoController & { parentController: TodoController & { parentController: undefined; }; } {
        const parentExist = Boolean(this.parentController)
        const grandpaExist = Boolean(this.parentController?.parentController);
        return parentExist && !grandpaExist;
    }

    /**
     * 是否为第二层及以下条目（有 parent 和 grandparent）。
     *
     * 类型收窄：`this is TodoController & { parentController: TodoController & { parentController: TodoController } }`
     */
    public isSubItem(): this is TodoController & { parentController: TodoController & { parentController: TodoController; }; } {
        const parentExist = Boolean(this.parentController)
        const grandpaExist = Boolean(this.parentController?.parentController);
        return parentExist && grandpaExist;
    }

    /**
     * 获取从 root 到当前 task 的路径（从左到右依次下降，包括 home task 和自己）。
     *
     * 沿 `parentController` 向上遍历收集 task，然后反转。
     *
     * @returns Task 数组，`[rootTask, ..., currentTask]`
     */
    private getCurrentPaths() {
        let curr: TodoController | undefined = this;
        let subpaths: Task[] = [];
        while (curr) {
            subpaths.push(curr.task);
            curr = curr.parentController;
        }
        return subpaths.reverse();
    }
}



