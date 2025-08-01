import type { TaskProxy, TaskProxyManager } from "$lib/states/meta/task.svelte";
import { TodoController } from "./TodoController.svelte";
import { makeViewIdByPaths } from "./utils";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import { PanelStateStore, StateStore } from "$lib/states/states/StatesTree.svelte";
import { eventbus } from "./eventbus";
import { tick } from "svelte";
import type { JournalProxy, JournalProxyManager } from "$lib/states/meta/journal.svelte";
import dayjs from "dayjs";
import { range } from "radash";


export interface PanelController {
    readonly id: string;
    zoomable(): boolean;
    pushPaths(childPaths: TaskProxy[]): void;
}

// 
export class EditorPanelController implements TodoLifeCycle, PanelController {
    /**
     * paths正常情况下不允许为空
     * paths的最后一个始终是当前页面的homeTodo, 即面包屑的最后一个&当前页面标题的Todo&当前页面的顶级节点的父节点
     */
    public $currentPaths: TaskProxy[];
    public $currentHomeController: TodoController;
    public readonly $isRootHome: boolean;


    constructor(
        public readonly id: string,
        public readonly panelStateStore: PanelStateStore,
        public readonly rootTaskId: string,
        db: TaskProxyManager,
    ) {
        const paths = this.panelStateStore.getPaths();
        const initialPaths = (paths).map((id) => db.build(id));

        this.$currentPaths = $state(initialPaths);

        this.$isRootHome = $derived(this.$currentPaths.length === 1);
        this.$currentHomeController = $state(null as unknown as TodoController); // 下面保证$effect.pre时一定会写入
        $effect.pre(() => {
            this.$currentHomeController = TodoController.createRoot(this, this.$currentPaths[this.$currentPaths.length - 1], panelStateStore.createHomeByPaths(this.$currentPaths));
            return () => {
                this.$currentHomeController.destory();
            }
        })
    }
    public onTodoReady() {

    }

    public destory() {
        console.debug("editor panel destoryed")
        // this.$currentHomeController.destory();
        // this.panelStateStore.savePaths(this.$currentPaths.map(x => x.id));
    }

    public savePaths() {
        this.panelStateStore.savePaths(this.$currentPaths.map(x => x.id));
    }

    zoomable() {
        return true;
    }

    /**
     * 
     * @param index 被点击的breadcrumb的index
     */
    public async popTo(index: number) {
        if (index < 0) {
            throw new Error("当前路径中未找到对应的task");
        }

        await this.withZoomoutTransition(index, () => {
            // 截取前面index个
            this.$currentPaths = this.$currentPaths.slice(0, index + 1);
        })
        this.savePaths();
    }

    // TODO:放到触发侧(breadcrumb/NavigatorController)
    private async withZoomoutTransition(index: number, doZoomout: () => void) {
        // 计算当前home在zoomout结束后的viewId
        const restPathIds = this.$currentPaths.slice(index).map(x => x.id);
        const homeNextViewId = makeViewIdByPaths(this.id, restPathIds);
        if (!homeNextViewId) {
            throw new Error("非法homeNextViewId");
        }

        eventbus.emit('zoomout:beforeStart', { homeNextViewId });
        await tick();
        const transition = document.startViewTransition(() => {
            doZoomout();
        });
        await transition.finished;
        eventbus.emit('zoomout:afterTransitioned', { homeNextViewId });
    }

    /**
     * 没有触发transition动画, 需要调用方自己触发
     * @param paths 从当前homeViewTask开始(包括当前homeViewTask), 到被点击的task为止
     */
    public pushPaths(childPaths: TaskProxy[]) {
        this.$currentPaths = [...this.$currentPaths, ...childPaths];
        this.savePaths();
    }

}

export class JournalPanelController implements TodoLifeCycle, PanelController {

    public constructor(
        public readonly id: string,
        public readonly panelStateStore: PanelStateStore,
        public readonly rootTaskId: string,
        public readonly db: JournalProxyManager,
    ) { }

    public onTodoReady() { }
    public destory() { }

    pushPaths(childPaths: TaskProxy[]): void {
        throw new Error("Method not implemented.");
    }

    zoomable() {
        return false;
    }

    public getJournalList(): JournalProxy[] {
        return this.genTimes().map((time) => {
            return this.db.getOrCreateJournal(
                time,
                "WEEK",
                time.format("MM/DD"),
                `${time.format("YYYY-MM-DD")} - ${time.add(1, "week").format("YYYY-MM-DD")}`,
            );
        });
    }

    public getTodoController(journal: JournalProxy): TodoController {
        const homeStateTree = this.panelStateStore.createHomeByPaths([journal.task]);
        return TodoController.createRoot(this, journal.task, homeStateTree);
    }



    private genTimes() {
        const start = dayjs().startOf("week").add(7, "day");
        return [...range(-7, 7)].map((offset) =>
            start.subtract(offset, "week"),
        );
    }

}