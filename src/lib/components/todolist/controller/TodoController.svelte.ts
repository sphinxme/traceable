
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
import { eventbus, type Events } from "./eventbus";


/**
 * 与每套Todo实例一一对应, 即以下的任意一套
 * - 与Todo.svelte/TodoItem.svelte/TodoList.svelte实例一一对应
 * - 与TodoView.svelte/Title.svelte/TodoList.svelte实例一一对应
 */
export class TodoController implements TodoLifeCycle {

    // focus注册&触发
    public readonly focusActions: TodoFocusActions;
    public readonly keyboardActions: TodoKeyboardActions;
    public readonly transitionActions: TodoTransitionActions;
    public readonly childrenActions: TodoChildrenActions;
    public readonly dragDropActions: DragDropActions;

    public noteEditOpen = $state(false);

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

    public static createRoot(panel: PanelController, task: Task, statesTree: StateStore) {
        return new TodoController(0, task, panel, makeViewId(panel.id, task.id), statesTree);
    }

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

    // 供UI调用, 在mounted, 并且注册完回调之后必须调用此函数
    public onTodoReady() {
        this.focusActions.onTodoReady();
        this.keyboardActions.onTodoReady();
        this.transitionActions.onTodoReady();
        this.childrenActions.onTodoReady();
        this.dragDropActions.onTodoReady();
    }

    // 需要可重复调用
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
    // children Controller
    public readonly childrenControllers: Map<string, TodoController> = new Map();


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

    public deleteMyself() {
        // parent.deleteChild(task)
        this.parentController?.task.deleteChild(this.task);
        this.destroy();
        throw new Error("not implemented");
    }

    // 其他函数

    /**
     * 把statetree和child都挪过去
     * @param anotherTask 
     */
    public receiveChild(anotherTask: TodoController, index?: number) {
        // 1. state先挪过去
        this.statesTree.receiveChild(anotherTask.statesTree);
        // 2. 先attach再删除
        this.task.attachChild(anotherTask.task, index);
        anotherTask.parentController?.task?.detachChild(anotherTask.task);
    }

    public calculateChildViewId(childTaskId: string) {
        return makeViewId(this.panel.id, childTaskId, this.viewId);
    }

    private _rootTaskId: string | undefined;
    get rootTaskId(): string {
        if (this._rootTaskId) return this._rootTaskId;
        this._rootTaskId = this.parentController
            ? this.parentController.rootTaskId
            : this.task.id;
        return this._rootTaskId;
    }

    /**
     * 沿路径展开所有祖先。
     * path[0] = root taskId, path[last] = target taskId。
     * 对 path[0]..path[length-2] 逐层设 $folded = false 并 getChild。
     */
    unfoldByPath(path: string[]): void {
        let current = this.statesTree;
        for (let i = 0; i < path.length - 1; i++) {
            current.$folded = false;
            current = current.getChild(path[i + 1]);
        }
    }

    // 是不是当前panel的root (此时todoitem是title)
    public isRoot(): this is TodoController & { parentController: undefined; } {
        return !this.parentController;
    }

    // 是第一列的todoitem (此时parent是root, root在往上就没有了)
    public isTopItem(): this is TodoController & { parentController: TodoController & { parentController: undefined; }; } {
        const parentExist = Boolean(this.parentController)
        const grandpaExist = Boolean(this.parentController?.parentController);
        return parentExist && !grandpaExist;
    }

    // 是不是第二层级之后的
    public isSubItem(): this is TodoController & { parentController: TodoController & { parentController: TodoController; }; } {
        const parentExist = Boolean(this.parentController)
        const grandpaExist = Boolean(this.parentController?.parentController);
        return parentExist && grandpaExist;
    }

    // 从左到右依次下降
    // 包括home task, 包括自己
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



