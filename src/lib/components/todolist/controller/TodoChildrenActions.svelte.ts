import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import { assertNotEmpty } from "./utils";

export class TodoChildrenActions implements TodoLifeCycle {

    constructor(
        public readonly host: TodoController,
    ) { }
    public onTodoReady() { }
    public destory() { }

    // children操作
    // 获取该孩子的下一个平级兄弟(如有)
    public getChildNextSlibing(childId: string): TodoController | undefined {
        const childIndex = this.getChildIndex(childId)
        if (this.host.task.children.size === childIndex + 1) {
            // 本身就是最后一个, 后面没有了
            return;
        }
        return this.getChildControllerByIndex(childIndex + 1);
    }

    public isChildLastOne(childId: string): boolean {
        const childIndex = this.getChildIndex(childId)
        return this.host.task.children.size === childIndex + 1;
    }

    // 获取该孩子的上一个平级兄弟(如有)
    public getChildPreSlibing(childId: string): TodoController | undefined {
        const childIndex = this.getChildIndex(childId)
        if (childIndex === 0) {
            // 本身就是第一个, 前面没有了
            return;
        }
        return this.getChildControllerByIndex(childIndex - 1);
    }

    public getChildIndex(childId: string): number {
        const childIndex = this.host.task.children.findIndex(childId);
        assertNotEmpty(childIndex, "未在父组件中找到孩子的位置");
        return childIndex;
    }

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