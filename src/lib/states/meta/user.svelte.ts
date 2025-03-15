import * as Y from "yjs";
import type { TaskProxyManager } from "./task.svelte";


export class UserManager {
    public readonly rootTaskId: string

    constructor(private yMap: Y.Map<any>, private taskManager: TaskProxyManager) {
        this.rootTaskId = this.yMap.get("rootTaskId")
        if (!this.rootTaskId) {
            const task = taskManager.newTask("ROOT");
            this.rootTaskId = task.id;
            this.yMap.set("rootTaskId", task.id)
        }
    }

    get rootTask() {
        return this.taskManager.build(this.rootTaskId)
    }
}