import type Quill from "quill";
import { eventbus } from "./eventbus";
import type { TodoController } from "./TodoController.svelte";
import { tick } from "svelte";
import { assertNotEmpty } from "./utils";
import { Range } from "quill";
import type { Context } from "quill/modules/keyboard";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";

export class TodoKeyboardActions implements TodoLifeCycle {
    constructor(
        public readonly host: TodoController,
    ) { }
    public onTodoReady() { }
    public destory() { }

    //////
    // 上下导航: up/down
    /////

    /**
     * 在todoitem中键盘按上, 向上导航
     */
    public navigateUp(cursorIndex: number) {
        // case1: 我就是root, 那就不上浮了
        if (!this.host.parentController) {
            return false;
        }

        // 跟parent找到自己的上一个同级兄弟
        const preSlibingController = this.host.parentController.childrenActions.getChildPreSlibing(this.host.task.id)
        if (!preSlibingController) {
            // case2: 如果我就已经是当前列表中的第一个了, 再上浮就上浮到父item
            return this.host.parentController.focusActions.onfocus(cursorIndex + 2);
        }
        // case3: 找到了上面的那个controller, 让他focusBottom
        return preSlibingController.focusActions.focusBottom(cursorIndex);
    }

    public navigateDown(cursorIndex: number) {
        // case 1: 还有孩子, 优先转给自己孩子
        if ((!this.host.statesTree.isCurrentFolded() || this.host.isRoot()) && this.host.task.children.size) {
            const firstChildId = this.host.task.children.getId(0);
            const firstChildController = this.host.childrenControllers.get(firstChildId);
            if (!firstChildController) {
                throw new Error("未找到对应child的controller");
            }
            return firstChildController.focusActions.onfocus(cursorIndex - 2);
        } else {
            // case 2: 没有孩子 转给下一个同级(如果没有下一个同级, 递归让上级找下一个同级)
            return this.host.focusActions.focusNext(cursorIndex);
        }
    }

    //////
    // 调整缩进: tab/untab
    /////

    public tab(cursorIndex: number): boolean {
        // case 0: panel title上不能tab
        if (!this.host.parentController) {
            return false;
        }

        const preSilbingController = this.host.parentController.childrenActions.getChildPreSlibing(this.host.task.id);
        if (!preSilbingController) {
            // case 1: 上面没有同级可以缩进, 什么也不做
            return false;
        }

        // case 2: 上面有同级可以缩进
        const originViewId = this.host.viewId;
        const nextViewId = preSilbingController.calculateChildViewId(this.host.task.id);

        eventbus.emit('tab:beforeStart', { originViewId, nextViewId, cursorIndex })
        console.log('tab:beforeStart', { originViewId, nextViewId, cursorIndex })
        // TODO: 是否需要await一下 等待变更前的todoView设置生效?
        const transition = document.startViewTransition(async () => {
            preSilbingController.moveInto(this.host);
            preSilbingController.statesTree.unfold();
        })
        transition.finished.then(() => {
            eventbus.emit('tab:afterTransitioned', { originViewId, nextViewId, cursorIndex })
            console.log('tab:afterTransitioned', { originViewId, nextViewId, cursorIndex });
        })
        return true;
    }
    public untab(cursorIndex: number): boolean {
        // case 1: panel Title上不能untab
        if (!this.host.parentController) {
            return false;
        }

        // case 2: 顶级todoitem上不能untab
        if (!this.host.parentController.parentController) {
            return false;
        }

        // case 3: 非顶级todoitem上可以untab
        // 借助爷爷, 成为父亲的下一个兄弟
        const grandpaController = this.host.parentController.parentController
        const parentIndex = grandpaController.childrenActions.getChildIndex(this.host.parentController.task.id);

        const originViewId = this.host.viewId;
        const nextViewId = grandpaController.calculateChildViewId(this.host.task.id);

        eventbus.emit('tab:beforeStart', { originViewId, nextViewId, cursorIndex })
        const transition = document.startViewTransition(async () => {
            grandpaController.moveInto(this.host, parentIndex + 1);
            // this.host.destory();
            await tick();
        })
        transition.finished.then(() => {
            eventbus.emit('tab:afterTransitioned', { originViewId, nextViewId, cursorIndex })
        })

        return true;
    }

    // enter
    // TODO:调整参数
    public enter(range: Range, curContext: Context, quill: Quill): boolean {
        const cursorIndex = range.index;

        // case 1: 当前为空, 且不是顶层, 且自己是当前列表的最后一个
        // 行为: untab
        // console.log(`[enter]`, { quill, length: quill.getLength(), s: quill.getContents(), isSub: this.host.isSubItem(), isLastOne: this.host.parentController.childrenActions.isChildLastOne(this.host.task.id) })
        if (
            quill.getLength() === 0 &&
            this.host.isSubItem() &&
            this.host.parentController.childrenActions.isChildLastOne(this.host.task.id)
        ) {
            return this.untab(cursorIndex);
        }

        // case 2: cursorIndex在末尾(suffix为空) (或内容为空的情况)
        if (curContext.suffix.length === 0 || this.host.isRoot()) {
            if (this.host.isRoot() || !this.host.statesTree.isCurrentFolded()) {
                // case 2.1: 当前已经展开
                // 行为: 在自己下级孩子list里的首部 增加一个空的item, 光标跳转在新增的item上
                const newChildTaskProxy = this.host.task.insertChild(0);
                const newViewId = this.host.calculateChildViewId(newChildTaskProxy.id);
                eventbus.emit('enter:taskNextFoucs', { newViewId, cursorIndex: 0 });
                return true;
            } else {
                // case 2.2: 当前未展开
                // 行为: 在自己下面新增一个空的item, 光标跳转在新增新增的item上面
                const newViewId = this.insertAfterMyself();
                eventbus.emit('enter:taskNextFoucs', { newViewId, cursorIndex: 0 });
                return true;
            }
        }

        // case 3: 光标在首部, prefix为空, 此时内容一定不为空
        // 行为: 在自己上面新增一个item, 然后光标跳转在新增的item上
        if (curContext.prefix.length === 0) {
            const newViewId = this.insertBeforeMyself();
            eventbus.emit('enter:taskNextFoucs', { newViewId, cursorIndex: 0 });
            return true;
        }

        // case 4: 光标在中间, cursorIndex不为0, 此时一定不是最后的位置(!==contentLength), 也一定不为空
        // 行为: 在自己上面新增一个item, 新item的值为光标前面截断(自己也要去掉光标前面的值), 然后光标还停留在自己item上
        this.insertBeforeMyself(quill.getText(new Range(0, cursorIndex))); // TODO:看下Range是否需要cursorIndex+1
        quill.editor.deleteText(0, cursorIndex);
        eventbus.emit('enter:taskNextFoucs', { newViewId: this.host.viewId, cursorIndex: 0 });
        return true;
    }

    private insertBeforeMyself(text?: string, note?: string) {
        assertNotEmpty(this.host.parentController, "根节点无法创建前序节点");

        const myIndex = this.host.parentController.childrenActions.getChildIndex(this.host.task.id);
        const newChildTask = this.host.parentController.task.insertChild(myIndex + 1, text, note);

        const newViewId = this.host.calculateChildViewId(newChildTask.id);
        return newViewId;
    }

    private insertAfterMyself(text?: string, note?: string) {
        assertNotEmpty(this.host.parentController, "根节点无法创建前序节点");

        const myIndex = this.host.parentController.childrenActions.getChildIndex(this.host.task.id);
        const newChildTask = this.host.parentController.task.insertChild(myIndex + 1, text, note);

        const newViewId = this.host.calculateChildViewId(newChildTask.id);
        return newViewId;
    }

    public shiftEnter() {
        this.host.noteEditOpen = !this.host.noteEditOpen;
    }

}