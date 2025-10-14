import * as Y from "yjs";
import type { TaskProxy } from "../meta/task.svelte";

/**
 * panel对应的Store
 */
export class PanelStateStore {
    public readonly panelStatesTree: Y.Map<any>;

    private constructor(
        statesStore: Y.Map<any>,
        public readonly panelId: string,
        public readonly rootTaskId: string,
    ) {
        if (!statesStore.has(panelId)) {
            statesStore.set(panelId, new Y.Map());
        }
        this.panelStatesTree = statesStore.get(panelId);
    }

    public static getOrCreateFromParentYMap(statesStore: Y.Map<any>, panelId: string, rootTaskId: string) {
        if (!statesStore.has(panelId)) {
            statesStore.set(panelId, this.generateStateYMap(rootTaskId));
        }

        return new PanelStateStore(statesStore.get(panelId), panelId, rootTaskId);
    }

    private static generateStateYMap(rootTaskId: string) {
        const m = new Y.Map();
        m.set("__paths__", [rootTaskId]);
        return m;
    }

    public getPaths(): string[] {
        return this.panelStatesTree.get("__paths__") || [this.rootTaskId]
    }

    public savePaths(paths: string[]) {
        this.panelStatesTree.set("__paths__", paths);
    }

    public getType(): "editor" | "journal" {
        return this.panelStatesTree.get("__type__");
    }

    public createHomeByPaths(paths: TaskProxy[]): StateStore {
        const subStatesTree = paths.reduce((stateTree, task) => {
            if (stateTree.has(task.id)) {
                return stateTree.get(task.id);
            }

            return stateTree.set(task.id, StateStore.generateTreeYMap());
        }, this.panelStatesTree);

        return new StateStore(subStatesTree, paths[paths.length - 1].id);
    }
}

/**
 * todo对应的StateStore
 * 生命周期与其挂载的Controller(TodoController)相对应, TodoController在destory时必须destory对应的stateStore
 */
export class StateStore {

    public constructor(
        public readonly statesTree: Y.Map<any>,
        public readonly taskId: string
    ) {
        if (!this.statesTree.has("__folded__")) {
            this.statesTree.set("__folded__", false);
        }
        this._folded = $state(this.statesTree.get("__folded__"));
        this.statesTree.observe(this.onFoldedChange);
    }

    private _folded: boolean;

    public get $folded() {
        return this._folded;
    }

    public set $folded(_folded: boolean) {
        if (_folded !== this._folded) {
            this.statesTree.set("__folded__", _folded);
        }
    }

    private onFoldedChange = () => {
        const currentFolded = this.statesTree.get("__folded__");
        if (currentFolded !== this._folded) {
            this._folded = currentFolded;
        }
    }

    public static generateTreeYMap() {
        const m = new Y.Map();
        m.set("__folded__", false);
        return m;
    }

    // 应该支持重复destory
    public destory() {
        // 生命周期与挂载的TodoController绑定
        this.statesTree.unobserve(this.onFoldedChange);
    }

    public isCurrentFolded() {
        let folded = this.statesTree.get("__folded__");
        if (folded == null) {
            folded = false;
            this.statesTree.set("__folded__", folded);
        }
        return folded;
    }

    public unfold() {
        this.$folded = false;
    }

    public fold() {
        this.$folded = true;
    }

    public getChild(taskId: string) {
        if (!this.statesTree) {
            console.error("error0")
        }
        let subState = this.statesTree.get(taskId);
        if (!subState) {
            subState = new Y.Map();
            subState.set("__folded__", false);
            this.statesTree.set(taskId, subState);
        }
        return new StateStore(subState, taskId);
    }

    // 执行后, 传入的StateStore就销毁了
    public moveInto(another: StateStore) {
        this.statesTree.set(another.taskId, another.statesTree.clone());
        if (another.statesTree.parent) {
            (another.statesTree.parent as Y.Map<any>).delete(another.taskId);
        }
        another.destory();
        return this.getChild(another.taskId);
    }

}