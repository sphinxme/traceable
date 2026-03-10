import type { Task } from "$lib/states/meta/task.svelte";
import { writable } from "svelte/store";
import { eventbus } from "./eventbus";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import type { StateStore } from "$lib/states/states/StatesTree.svelte";
import hotkeys from "hotkeys-js";
import { willCreateCycle } from "$lib/components/graph/graph";

interface DraggingTaskData {
    originPanelId: string,
    originViewId: string,
    originParent: Task,
    task: Task,
    states: StateStore,
}

export let draggingTaskData: DraggingTaskData | undefined;
export function setDraggingTaskData(data: DraggingTaskData) {
    draggingTaskData = data;
}

export function clearDraggingTaskData() {
    draggingTaskData = undefined;
}

export let dragging = writable(false);
eventbus.on("drag:start", () => dragging.set(true));
eventbus.on("drag:end", () => dragging.set(false));

export class DragDropActions implements TodoLifeCycle {

    public $isMeDragging = $state(false);

    public constructor(
        public readonly host: TodoController,
    ) { }

    // lifecycle
    public onTodoReady() { }
    public destory() { }

    // drag
    public startDrag() {
        if (!this.host.parentController) {
            throw new Error("home不能拖拽!")
        }

        let data: DraggingTaskData = {
            originPanelId: this.host.panel.id,
            originViewId: this.host.viewId,
            originParent: this.host.parentController?.task,
            task: this.host.task,
            states: this.host.statesTree,
        }
        setDraggingTaskData(data);
        this.$isMeDragging = true;
        eventbus.emit('drag:start', data);
    }

    public endDrag() {
        eventbus.emit('drag:end', {
            originPanelId: this.host.panel.id,
            originViewId: this.host.viewId,
            task: this.host.task,
        })
        this.$isMeDragging = false;
        clearDraggingTaskData();
    }

    // drop
    public dropIntoMe(metaKeyPressed: boolean, targetIndex?: number) {
        if (!draggingTaskData) {
            throw new Error("dragging数据为空");
        }

        if (targetIndex === undefined) {
            targetIndex = this.host.task.children.size - 1;
        }

        switch (this.shouldMove(metaKeyPressed, targetIndex)) {
            case 'none':
                return;
            case 'copy':
                // TODO: 先不支持
                console.log('copy')
                return;
            case 'link':
                console.log('link')
                if (this.willCreateCycle(draggingTaskData.task)) {
                    alert('会成环!')
                    return;
                }
                this.host.task.attachChild(draggingTaskData.task, targetIndex);
                return;
            case "move":
                console.log('move')
                // 如果是在同一个list中, 仅调换位置, 就直接move
                if ((this.host.task.id === draggingTaskData.originParent.id) && draggingTaskData.originPanelId === this.host.panel.id) {
                    console.log("move into same list");
                    console.log({
                        originParentId: draggingTaskData.originParent.id,
                        originTaskId: draggingTaskData.task.id,
                        targetIndex,
                    });

                    const currentIndex = this.host.childrenActions.getChildIndex(draggingTaskData.task.id)
                    if (currentIndex === targetIndex) {
                        return;
                    } else if (currentIndex < targetIndex) {
                        targetIndex--;
                    }

                    return this.host.task.children.move(draggingTaskData.task.id, targetIndex); // FIXME:targetIndex其实是有问题的
                }

                if (this.willCreateCycle(draggingTaskData.task)) {
                    alert('会成环!')
                    return;
                }

                // 先attach再detach
                // 1. attach
                this.host.task.attachChild(draggingTaskData.task, targetIndex);
                this.host.statesTree.moveInto(draggingTaskData.states);
                // 2. detach from origin
                draggingTaskData.originParent.deleteChild(draggingTaskData.task);
                return;
        }
    }

    public dragOverMe(metaKeyPressed: boolean, targetIndex?: number): DataTransfer["dropEffect"] {
        if (targetIndex === undefined) {
            targetIndex = this.host.task.children.size - 1;
        }

        const result = this.shouldMove(metaKeyPressed, targetIndex);
        return result;
    }

    private willCreateCycle(task: Task) {
        return willCreateCycle(this.host.task, task);
    }


    // ondragover
    // 1. 判断当前复制还是移动(设置鼠标)
    // 2. 控制高亮显示 或是 插入位置指示条 (这个可以由Svelte组件来做)
    // 3. 


    private shouldMove(metaKeyPressed: boolean, targetIndex: number): DataTransfer["dropEffect"] {
        if (!draggingTaskData) {
            console.warn("dragging数据为空")
            return 'none';
        }

        // 不让放到自己或者自己的子节点上
        let currentTodo: TodoController | undefined = this.host;
        while (currentTodo) {
            if (currentTodo.task.id == draggingTaskData.task.id) {
                return 'none';
            }
            currentTodo = currentTodo.parentController;
        }

        if (draggingTaskData.originParent.id === this.host.task.id) {
            // 1. 如果是同一个的同一个位置(插入之后没动弹) 就不行
            const index = this.host.childrenActions.getChildIndex(draggingTaskData.task.id);

            if (index === targetIndex || index + 1 === targetIndex) {
                return 'none';
            }

            // 2. 如果是同一个parentTaskId, 那就只是换位置
            // 如果是在同一个list中, 仅调换位置, 就直接move
            if (this.host.task.id === draggingTaskData.originParent.id) {
                return 'move';
            }
        }

        // 同panel内move, 不同panel内link
        const samePanel = this.host.panel.id === draggingTaskData.originPanelId;

        if (metaKeyPressed) {
            console.log('metaKeyPressed')
            if (samePanel) {
                return 'link';
            } else {
                return 'move';
            }
        } else {
            if (samePanel) {
                return 'move';
            } else {
                return 'link';
            }
        }
    }
}