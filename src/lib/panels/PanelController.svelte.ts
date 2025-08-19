import type { TaskProxy, TaskProxyManager } from "$lib/states/meta/task.svelte";
import { TodoController } from "../components/todolist/controller/TodoController.svelte";
import { makeViewIdByPaths } from "../components/todolist/controller/utils";
import type { TodoLifeCycle } from "../components/todolist/controller/ILifeCycle.svelte";
import { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
import { eventbus } from "../components/todolist/controller/eventbus";
import { tick } from "svelte";
import type { PanelController } from "../components/todolist/controller/IPanelController.svelte";

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
                if (this.$currentHomeController) {
                    this.$currentHomeController.destory();
                }
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

