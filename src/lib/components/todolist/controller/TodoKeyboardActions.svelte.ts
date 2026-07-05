import type Quill from "quill";
import type { TodoController } from "./TodoController.svelte";
import { tick } from "svelte";
import { assertNotEmpty } from "./utils";
import { Range } from "quill";
import type { Context } from "quill/modules/keyboard";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import { willCreateCycle } from "$lib/components/graph/graph";

/**
 * Todo 键盘操作处理器。
 *
 * 处理 Quill 编辑器中的键盘交互，包括：
 * - **上下导航**（ArrowUp / ArrowDown）：在控制器树中递归导航
 * - **缩进调整**（Tab / Shift+Tab）：改变任务的父子层级关系
 * - **新建条目**（Enter）：根据光标位置和上下文有 4 种行为
 * - **笔记开关**（Shift+Enter）：切换笔记编辑器
 *
 * 键盘绑定在 `TodoItem.svelte` 的 `onMount` 中通过 `editor.keyboard.addBinding` / `unshift` 注册。
 * Action 类不持有 Quill 实例引用，通过返回值控制 Quill 默认行为（`false` = 执行默认，`true` = 阻止默认）。
 */
export class TodoKeyboardActions implements TodoLifeCycle {
    /**
     * @param host 关联的 TodoController
     */
    constructor(
        public readonly host: TodoController,
    ) { }
    public onTodoReady() { }
    public destroy() { }

    ///////
    // 上下导航: up/down
    ///////

    /**
     * 在 TodoItem 中按 ArrowUp — 向上导航。
     *
     * 三种 case：
     * 1. 我是 root → 不上浮
     * 2. 我是当前列表第一个 → 上浮到父 item（cursorIndex + 2 补偿缩进）
     * 3. 找到了上面的兄弟 → 让它 `focusBottom`（递归到其最后一个叶子）
     *
     * @param cursorIndex 当前光标位置
     * @returns `false` 表示未处理（Quill 执行默认行为），`true` 表示已处理
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

    /**
     * 在 TodoItem 中按 ArrowDown — 向下导航。
     *
     * 两种 case：
     * 1. 有孩子且未折叠 → 转给第一个孩子（cursorIndex - 2 补偿缩进）
     * 2. 无孩子或已折叠 → `focusNext` 找下一个平级兄弟（递归上浮）
     *
     * @param cursorIndex 当前光标位置
     * @returns `false` 表示未处理，`true` 表示已处理
     */
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

    /**
     * 按 Tab — 增加缩进（成为上方兄弟的子任务）。
     *
     * 流程：
     * 1. root 不能 tab
     * 2. 上方无兄弟 → 不操作
     * 3. 上方有兄弟 → 环检测 → `cursor.startTab` → `transitionActions.onBeforeTabStart` →
     *    `document.startViewTransition` → `preSilbingController.receiveChild(this.host)` + 展开
     *    → `cursor.endTab`
     *
     * @param cursorIndex 当前光标位置
     * @returns `false` 表示未处理，`true` 表示已处理
     */
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
        if (willCreateCycle(preSilbingController.task, this.host.task)) {
            alert("会成环!")
        }

        this.host.panel.interaction.cursor.startTab(originViewId, nextViewId, cursorIndex);
        this.host.transitionActions.onBeforeTabStart({ originViewId, nextViewId, cursorIndex });
        // TODO: 是否需要await一下 等待变更前的todoView设置生效?
        const transition = document.startViewTransition(async () => {
            preSilbingController.receiveChild(this.host);
            preSilbingController.statesTree.unfold();
        })
        transition.finished.then(() => {
            this.host.panel.interaction.cursor.endTab(nextViewId);
        })
        return true;
    }
    /**
     * 按 Shift+Tab — 减少缩进（借助爷爷成为父亲的下一个兄弟）。
     *
     * 流程：
     * 1. root / 顶层 item 不能 untab
     * 2. 非顶层 → `cursor.startTab` → `transitionActions.onBeforeTabStart` →
     *    `document.startViewTransition` → `grandpaController.receiveChild(this.host, parentIndex + 1)`
     *    → `cursor.endTab`
     *
     * @param cursorIndex 当前光标位置
     * @returns `false` 表示未处理，`true` 表示已处理
     */
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

        this.host.panel.interaction.cursor.startTab(originViewId, nextViewId, cursorIndex);
        this.host.transitionActions.onBeforeTabStart({ originViewId, nextViewId, cursorIndex });
        const transition = document.startViewTransition(async () => {
            grandpaController.receiveChild(this.host, parentIndex + 1);
            // this.host.destroy();
            await tick();
        })
        transition.finished.then(() => {
            this.host.panel.interaction.cursor.endTab(nextViewId);
        })

        return true;
    }

    /**
     * 按 Enter — 根据光标位置和上下文有 4 种行为。
     *
     * **case 1**: 空内容 + 非顶层 + 当前列表最后一个 → `untab`（减少缩进）
     *
     * **case 2**: 光标在末尾（suffix 为空）或 root：
     * - 2.1 已展开或有子 → 在子列表首部插入新 item
     * - 2.2 未展开 → 在自己后面插入新 item
     *
     * **case 3**: 光标在首部（prefix 为空）→ 在自己上面插入新 item
     *
     * **case 4**: 光标在中间 → 截断：前面内容给新 item，后面留给自己
     *
     * @param range Quill 选区
     * @param curContext Quill 键盘上下文（含 prefix / suffix）
     * @param quill Quill 编辑器实例
     * @returns `false` 表示未处理，`true` 表示已处理
     */
    // enter
    // TODO:调整参数
    public enter(range: Range, curContext: Context, quill: Quill): boolean {
        const cursorIndex = range.index;


        // case 1: 当前为空, 且不是顶层, 且自己是当前列表的最后一个
        // 行为: untab
        // console.log(`[enter]`, { quill, length: quill.getLength(), s: quill.getContents(), isSub: this.host.isSubItem(), isLastOne: this.host.parentController.childrenActions.isChildLastOne(this.host.task.id) })
        if (
            quill.getText().trim().length === 0 &&
            this.host.isSubItem() &&
            this.host.parentController.childrenActions.isChildLastOne(this.host.task.id)
        ) {
            return this.untab(cursorIndex);
        }

        // case 2: cursorIndex在末尾(suffix为空) (或内容为空的情况)
        if (curContext.suffix.length === 0 || this.host.isRoot()) {
            if (this.host.isRoot() || (!this.host.statesTree.isCurrentFolded() && this.host.task.children.size)) {
                // case 2.1: 当前已经展开
                // 行为: 在自己下级孩子list里的首部 增加一个空的item, 光标跳转在新增的item上
                const newChildTaskProxy = this.host.task.insertChild(0);
                const newViewId = this.host.calculateChildViewId(newChildTaskProxy.id);
                this.host.panel.interaction.cursor.requestFocusInsert(newViewId, 0);
                return true;
            } else {
                // case 2.2: 当前未展开
                // 行为: 在自己下面新增一个空的item, 光标跳转在新增新增的item上面
                const newViewId = this.insertAfterMyself();
                this.host.panel.interaction.cursor.requestFocusInsert(newViewId, 0);
                return true;
            }
        }

        // case 3: 光标在首部, prefix为空, 此时内容一定不为空
        // 行为: 在自己上面新增一个item, 然后光标跳转在新增的item上
        if (curContext.prefix.length === 0) {
            const newViewId = this.insertBeforeMyself();
            this.host.panel.interaction.cursor.requestFocusInsert(newViewId, 0);
            return true;
        }

        // case 4: 光标在中间, cursorIndex不为0, 此时一定不是最后的位置(!==contentLength), 也一定不为空
        // 行为: 在自己上面新增一个item, 新item的值为光标前面截断(自己也要去掉光标前面的值), 然后光标还停留在自己item上
		this.insertBeforeMyself(quill.getText(new Range(0, cursorIndex))); // TODO:看下Range是否需要cursorIndex+1
		quill.deleteText(0, cursorIndex);
		this.host.panel.interaction.cursor.requestFocusInsert(this.host.viewId, 0);
        return true;
    }

    /**
     * 在自身前面插入新 item（由父任务 `insertChild` 在当前索引处插入）。
     *
     * @param text 新 item 的初始文本（可选）
     * @returns 新 item 的 viewId
     */
    private insertBeforeMyself(text?: string) {
        assertNotEmpty(this.host.parentController, "根节点无法创建前序节点");

        const myIndex = this.host.parentController.childrenActions.getChildIndex(this.host.task.id);
        const newChildTask = this.host.parentController.task.insertChild(myIndex, text);

        const newViewId = this.host.calculateChildViewId(newChildTask.id);
        return newViewId;
    }

    /**
     * 在自身后面插入新 item（由父任务 `insertChild` 在当前索引 + 1 处插入）。
     *
     * @param text 新 item 的初始文本（可选）
     * @returns 新 item 的 viewId
     */
    private insertAfterMyself(text?: string) {
        assertNotEmpty(this.host.parentController, "根节点无法创建前序节点");

        const myIndex = this.host.parentController.childrenActions.getChildIndex(this.host.task.id);
        const newChildTask = this.host.parentController.task.insertChild(myIndex + 1, text);

        const newViewId = this.host.parentController.calculateChildViewId(newChildTask.id);
        return newViewId;
    }

    /**
     * 按 Shift+Enter — 切换笔记编辑器（Popover）的开关状态。
     */
    public shiftEnter() {
        this.host.noteEditOpen = !this.host.noteEditOpen;
    }

}