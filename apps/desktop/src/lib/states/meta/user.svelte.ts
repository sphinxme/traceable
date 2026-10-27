import * as Y from "yjs";
import type { Store } from "./store.svelte";

export class UserManager {
    public readonly rootTaskId: string;

    constructor(private yMap: Y.Map<any>, private store: Store) {
        this.rootTaskId = this.yMap.get("rootTaskId");
        if (!this.rootTaskId) {
            const task = this.store.createTask("ROOT");
            this.rootTaskId = task.id;
            this.yMap.set("rootTaskId", task.id);
        }
    }

    get rootTask() {
        return this.store.getTask(this.rootTaskId);
    }
}
