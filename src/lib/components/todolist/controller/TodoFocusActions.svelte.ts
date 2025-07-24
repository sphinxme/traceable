import { eventbus } from "./eventbus";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";

eventbus.on("enter:taskNextFoucs", (event) => {
    focusOnInsertReadyViewId = event.newViewId;
    focusOnInsertReadyCursorIndex = event.cursorIndex;
})

// insert的时候用
// ready的时候检查一下 是不是自己被插入了 要不要focus一下自己
let focusOnInsertReadyViewId = "";
let focusOnInsertReadyCursorIndex = 0;

export class TodoFoucsActions implements TodoLifeCycle {

    constructor(
        public readonly host: TodoController
    ) { }



    public onTodoReady() {
        if (this.host.viewId === focusOnInsertReadyViewId) {
            this.onfocus(focusOnInsertReadyCursorIndex);
            focusOnInsertReadyCursorIndex = 0;
            focusOnInsertReadyViewId = "";
        }
    }

    public destory() { }

    /**
     * UI加载后把回调挂载到这里
     * (如果是root 就是title; 如果是todo就是item)
     * 成功focus时, 返回true
     * 注意cursorIndex可能为负值或特别大的值
     */
    public onfocus: (cursorIndex: number) => boolean = () => false;

    public focusBottom(cursorIndex: number): boolean {
        // 1. 如果已经折叠, 那么就focus自己
        const isFolded = this.host.statesTree.isCurrentFolded();
        if (isFolded) {
            return this.onfocus(cursorIndex);
        }

        // 2. 如果没有child了, 那么就focus自己
        if (this.host.task.children.size === 0) {
            return this.onfocus(cursorIndex);
        }

        // 3. 如果没有折叠, 那就递归调用最后一个child的focusBottom
        const lastChildIndex = this.host.task.children.size - 1;
        return this.host.childrenActions.getChildControllerByIndex(lastChildIndex).focusActions.focusBottom(cursorIndex - 2);
    }

    // focus自己的下一个平级兄弟
    public focusNext(cursorIndex: number): boolean {
        if (!this.host.parentController) {
            return false;
        }

        const nextSlibingController = this.host.parentController.childrenActions.getChildNextSlibing(this.host.task.id);
        if (!nextSlibingController) {
            // 自己就是当前最后一个, 那就再上浮
            return this.host.parentController.focusActions.focusNext(cursorIndex + 2);
        }

        // 下面还有children, 那就下浮一下
        return nextSlibingController.focusActions.onfocus(cursorIndex);
    }

}