
import { TaskProxy } from "$lib/states/meta/task.svelte";
import { TodoFoucsActions } from "./TodoFocusActions.svelte";
import { TodoKeyboardActions } from "./TodoKeyboardActions.svelte";
import { TodoTransitionActions } from "./TodoTransitionActions.svelte";
import { TodoChildrenActions } from "./TodoChildrenActions.svelte";
import { StateStore } from "$lib/states/states/StatesTree.svelte";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import { makeViewId } from "./utils";
import { type PanelController } from "./PanelController.svelte";
import { DragDropActions } from "./DragDropActions.svelte";


/**
 * 与每套Todo实例一一对应, 即以下的任意一套
 * - 与Todo.svelte/TodoItem.svelte/TodoList.svelte实例一一对应
 * - 与TodoView.svelte/Title.svelte/TodoList.svelte实例一一对应
 */
export class TodoController implements TodoLifeCycle {

    // TODO:
    // 4. drag & drop

    // focus注册&触发
    public readonly focusActions: TodoFoucsActions;
    public readonly keyboardActions: TodoKeyboardActions;
    public readonly transitionActions: TodoTransitionActions;
    public readonly childrenActions: TodoChildrenActions;
    public readonly dragDropActions: DragDropActions;

    public noteEditOpen = $state(false);

    private constructor(
        public readonly depth: number,
        public readonly task: TaskProxy,
        public readonly panel: PanelController,
        public readonly viewId: string,
        public readonly statesTree: StateStore,
        public readonly parentController?: TodoController,
    ) {
        this.focusActions = new TodoFoucsActions(this);
        this.keyboardActions = new TodoKeyboardActions(this);
        this.transitionActions = new TodoTransitionActions(this);
        this.childrenActions = new TodoChildrenActions(this);
        this.dragDropActions = new DragDropActions(this);
    }

    // protected itemQuillEditor: Quill | undefined;
    // protected noteQuillEditor: Quill | undefined;

    public static createRoot(panel: PanelController, task: TaskProxy, statesTree: StateStore) {
        return new TodoController(0, task, panel, makeViewId(panel.id, task.id), statesTree);
    }

    public makeChild(task: TaskProxy) {
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
    public destory() {
        if (this.parentController) {
            this.parentController.childrenControllers.delete(this.task.id);
        }
        // this.childrenControllers.forEach((childController) => {
        //     childController.destory();
        // })

        this.focusActions.destory();
        this.keyboardActions.destory();
        this.transitionActions.destory();
        this.childrenActions.destory();
        this.dragDropActions.destory();
        this.statesTree.destory();

    }
    // children Controller
    public readonly childrenControllers: Map<string, TodoController> = new Map();

    // hooks: 由UI注入到这里, 当外部变动时, 调用这些函数来触发UI操作
    public doHighlight: () => void = () => { };

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
        this.destory();
        throw new Error("not implemented");
    }

    // 其他函数

    /**
     * 把statetree和child都挪过去
     * @param anotherTask 
     */
    public moveInto(anotherTask: TodoController, index?: number) {
        // 1. state先挪过去
        this.statesTree.moveInto(anotherTask.statesTree);
        // 2. 先attach再删除
        this.task.attachChild(anotherTask.task, index);
        anotherTask.parentController?.task?.detachChild(anotherTask.task);
    }

    public calculateChildViewId(childTaskId: string) {
        return makeViewId(this.panel.id, childTaskId, this.viewId);
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
        let subpaths: TaskProxy[] = [];
        while (curr) {
            subpaths.push(curr.task);
            curr = curr.parentController;
        }
        return subpaths.reverse();
    }
}



