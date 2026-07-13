import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import { assertNotEmpty } from "./utils";

/**
 * Todo 子任务查询处理器 — 提供基于控制器树的子任务索引与兄弟节点查找。
 *
 * 所有方法都通过 `host.childrenControllers` Map 和 `host.task.children` Yjs Array
 * 双重查找，将 taskId 映射到对应的 `TodoController`。
 *
 * 主要服务于：
 * - `TodoKeyboardActions`（导航 / Tab / Enter 时的兄弟和索引查找）
 * - `TodoFocusActions`（`focusBottom` / `focusNext` 时的兄弟导航）
 * - `DragDropActions`（拖放时的位置计算）
 */
export class TodoChildrenActions implements TodoLifeCycle {

    /**
     * @param host 关联的 TodoController
     */
    constructor(
        public readonly host: TodoController,
    ) { }
    public onTodoReady() { }
    public destroy() { }

    // children操作
    /**
     * 获取指定子任务的下一个平级兄弟控制器。
     *
     * @param childId 子任务 ID
     * @returns 下一个兄弟的 TodoController，如果已是最后一个则返回 undefined
     */
    public getChildNextSlibing(childId: string): TodoController | undefined {
        const childIndex = this.getChildIndex(childId)
        if (this.host.task.children.size === childIndex + 1) {
            // 本身就是最后一个, 后面没有了
            return;
        }
        return this.getChildControllerByIndex(childIndex + 1);
    }

    /**
     * 判断指定子任务是否是当前列表的最后一个。
     *
     * @param childId 子任务 ID
     * @returns `true` 如果是最后一个
     */
    public isChildLastOne(childId: string): boolean {
        const childIndex = this.getChildIndex(childId)
        return this.host.task.children.size === childIndex + 1;
    }

    /**
     * 获取指定子任务的上一个平级兄弟控制器。
     *
     * @param childId 子任务 ID
     * @returns 上一个兄弟的 TodoController，如果已是第一个则返回 undefined
     */
    public getChildPreSlibing(childId: string): TodoController | undefined {
        const childIndex = this.getChildIndex(childId)
        if (childIndex === 0) {
            // 本身就是第一个, 前面没有了
            return;
        }
        return this.getChildControllerByIndex(childIndex - 1);
    }

    /**
     * 获取指定子任务在父任务 children 数组中的索引。
     *
     * @param childId 子任务 ID
     * @returns 索引位置
     * @throws 如果未找到则抛出错误
     */
    public getChildIndex(childId: string): number {
        const childIndex = this.host.task.children.findIndex(childId);
        assertNotEmpty(childIndex, "未在父组件中找到孩子的位置");
        return childIndex;
    }

    /**
     * 按索引获取子任务的 TodoController。
     *
     * @param index 索引位置
     * @returns 对应的 TodoController
     * @throws 如果索引越界或未找到对应 controller 则抛出错误
     */
    public getChildControllerByIndex(index: number): TodoController {
        if (index >= this.host.task.children.size || index < 0) {
            throw new Error("[getChildControllerByIndex]: 大小越界")
        }
        const childId = this.host.task.children.getId(index);
        const childController = this.host.childrenControllers.get(childId);
        assertNotEmpty(childController, "未找到对应id的childController");
        return childController;
    }

}