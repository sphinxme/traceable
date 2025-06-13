import * as Y from "yjs";
import type { TaskProxy } from "../meta/task.svelte";
import { BehaviorSubject, distinctUntilChanged, map, Observable, of, share, shareReplay, tap } from "rxjs";
import { getContext, setContext } from "svelte";

export type StateMap = Y.Map<boolean | StateMap>
// Journal

export class JournalPanelState {
    private readonly id: string;
    private readonly panelState: Y.Map<any>;
    private readonly foldStatesTree: Y.Map<any>;

    constructor(panelId: string, states: Y.Map<any>) {
        this.id = panelId;

        if (!states.has(panelId)) {
            states.set(panelId, new Y.Map());
        }

        this.panelState = states.get(panelId);
        if (!this.panelState.has("foldStates")) {
            this.panelState.set("foldStates", new Y.Map());
        }

        this.foldStatesTree = this.panelState.get("foldStates")
    }

    loadChild(task: TaskProxy) {
        let subState = this.foldStatesTree.get(task.id)
        if (!subState) {
            subState = new Y.Map();
            this.foldStatesTree.set(task.id, subState)
        }
        return of(EditorItemState.buildFromJournal(this.id, subState, [], this.foldStatesTree))
    }
}

// Editor

// 单个panel的状态
export class EditorPanelState {
    public readonly id: string; // panelId
    public readonly paths: BehaviorSubject<TaskProxy[]>; // paths仅本地内存保存
    private readonly panelState: Y.Map<any>;
    private readonly foldStatesTree: Y.Map<any>;

    constructor(panelId: string, paths: TaskProxy[], states: Y.Map<any>) {
        this.id = panelId;

        if (!states.has(panelId)) {
            states.set(panelId, new Y.Map());
        }
        this.panelState = states.get(panelId);

        this.paths = new BehaviorSubject(paths); // writable

        if (!this.panelState.has("foldStates")) {
            this.panelState.set("foldStates", new Y.Map());
        }
        this.foldStatesTree = this.panelState.get("foldStates")
    }

    public get rootState$() {
        return this.paths.pipe(
            map((currentPaths, index) => {
                return this.loadRootState(currentPaths)
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
    }

    /**
     * 调用时 需要确保paths已经更新
     */
    private loadRootState(currentPaths: TaskProxy[]): EditorItemState {
        let tree = this.foldStatesTree;
        let currentRootTask = currentPaths.at(-1)
        if (!currentRootTask) {
            throw new Error("empty paths");
        }
        let state = tree;

        // 步进到当前树位置
        for (const path of currentPaths) {
            const taskId = path.id;
            state = state.get(taskId);
            if (!state) {
                state = new Y.Map();
                tree.set(taskId, state);
            }
        }
        return EditorItemState.buildFromEditor(this.id, currentRootTask, this, undefined, [...currentPaths], [], state);
    }

    public get path$() {
        return this.paths;
    }

    public pop(i: number) {
        this.paths.next([...(this.paths.value.slice(0, i))]);
    }

    public push(subPaths: TaskProxy[]) {
        this.paths.next([...this.paths.value, ...subPaths])
    }
}

/**
 * 标识一个path路径, path被搞出来之后就不会变动了
 * 
 */
export class EditorItemState {
    /**
     * 
     */
    public debugRootFoldState() {
        return this.foldStatesTree.toJSON()
    }

    static buildFromJournal(
        panelId: string,
        task: TaskProxy,
        relativePath: TaskProxy[],
        foldStatesTree: Y.Map<any>
    ) {
        return new EditorItemState(panelId, task, undefined, undefined, [], [], foldStatesTree, false);
    }

    static buildFromEditor(
        panelId: string,
        currentTask: TaskProxy,
        panelState: EditorPanelState | undefined,
        parentState: EditorItemState | undefined,

        /**
         * 从root出发, 到当前zoom root的的路径, 包含root本身, 包含zoomroot
         */
        currentParentPath: TaskProxy[],

        /**
         * 从当前panel的zoom root出发(不包含zoom root), 到当前Item的相对路径; 
         * 如果当前item就是zoom root, 则relativePath为空数组; 
         * 如果当前item不是zoom root, 则relativePath会包含当前item.
         * @see this.relativePath
         */
        relativePath: TaskProxy[],
        foldStatesTree: Y.Map<any>,
    ): EditorItemState {
        return new EditorItemState(panelId, currentTask, panelState, parentState, currentParentPath, relativePath, foldStatesTree, true)
    }

    // 从editor上创建
    constructor(
        public readonly panelId: string,
        public readonly task: TaskProxy,
        private readonly panelState: EditorPanelState | undefined,
        private readonly parentState: EditorItemState | undefined,
        private readonly currentParentPath: TaskProxy[],

        /**
         * 从当前panel的zoom root出发(不包含zoom root), 到当前Item的相对路径; 
         * 如果当前item就是zoom root, 则relativePath为空数组; 
         * 如果当前item不是zoom root, 则relativePath会包含当前item.
         */
        public readonly relativePath: TaskProxy[],
        private readonly foldStatesTree: Y.Map<any>,

        public readonly zoomable: boolean = true,
    ) {
    }

    public loadChild(task: TaskProxy): EditorItemState {
        let subState = this.foldStatesTree.get(task.id)
        if (!subState) {
            subState = new Y.Map();
            this.foldStatesTree.set(task.id, subState)
        }
        if (!this.zoomable) {
            return EditorItemState.buildFromJournal(this.panelId, task, [...this.relativePath, this.task], subState)
        } else {
            return EditorItemState.buildFromEditor(this.panelId, task, this.panelState, this, this.currentParentPath, [...this.relativePath, task], subState)
        }
    }

    // push到当前这个item
    public zoomIn() {
        if (this.zoomable) {
            this.panelState?.push(this.relativePath)
        }
    }

    public get isRoot() {
        return this.currentParentPath.length === 1
    }

    public get depth() {
        return this.relativePath.length;
    }

    public get absolutePaths() {
        if (!this.zoomable || !this.panelState) {
            throw new Error("not zoomable");
        }
        return [...this.panelState.paths.value, ...this.relativePath]
    }

    // get folded$() {
    //     if (!this.foldStatesTree.has("__folded__")) {
    //         this.foldStatesTree.set("__folded__", false)
    //     }

    //     return new Observable<boolean>(subscriber => {
    //         subscriber.next(this.foldStatesTree.get("__folded__") || false);
    //         return register(this.foldStatesTree, (event, transaction) => {
    //             subscriber.next(this.foldStatesTree.get("__folded__"))
    //         });
    //     }).
    //         pipe(distinctUntilChanged());
    // }

    // 仅会响应折叠状态
    // TODO:如果值没有发生变化(同一个指针) svelte还会响应嘛?
    get $() {
        if (!this.foldStatesTree.has("__folded__")) {
            this.foldStatesTree.set("__folded__", false)
        }

        let folded = this.foldStatesTree.get("__folded__");

        return new Observable<EditorItemState>(subscriber => {
            subscriber.next(this);
            return register(this.foldStatesTree, (event, transaction) => {
                const nextFolded = this.foldStatesTree.get("__folded__");
                if (folded != nextFolded) {
                    folded = nextFolded;
                    subscriber.next(this);
                }
            });
        }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }

    get folded() {
        return this.foldStatesTree.get("__folded__") || false;
    }

    set folded(value: boolean) {
        this.foldStatesTree.set("__folded__", value);
    }

    public moveInto(childState: EditorItemState | undefined) {
        if (!childState) {
            return;
        }
        const copied = childState.foldStatesTree.clone()
        childState.parentState?.remove(childState)
        this.foldStatesTree.set(childState.task.id, copied)
    }

    public remove(childState: EditorItemState) {
        this.foldStatesTree.delete(childState.task.id)
    }
}

export function setStateIntoContext(state: Observable<EditorItemState>) {
    setContext("parentState", state);
}

// loadTodoItemStateFromContext
export function loadStateFromContext(task: TaskProxy) {
    // const parentState = getParentStateContext()
    // const state = parentState.loadChild(task)
    // setContext("parentState", state);
    // return state;
}

export function getParentStateContext(): Observable<EditorItemState> {
    const parentState = getContext("parentState");
    if (!(parentState instanceof Observable)) {
        throw new Error("no parent state detected in context");
    }
    return parentState;
}

function register<T>(y: Y.AbstractType<T>, callback: (event: T, transaction: Y.Transaction) => void) {
    y.observe(callback);
    return () => {
        y.unobserve(callback);
    }
}