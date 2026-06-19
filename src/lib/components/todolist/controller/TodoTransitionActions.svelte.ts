import { tick } from "svelte";
import { eventbus, type Events } from "./eventbus";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import { makeViewId } from "./utils";

// 正在zoom out的, zoom out之前的home task, 那个task在zoom out之后的viewId. 当加载发现自己是的时候, 要把自己的title和todoList ViewTransitionName设上
let zoomingViewId = "";
eventbus.on("zoominto:beforeStart", (event) => {
    zoomingViewId = event.futureHomeViewId;
})
eventbus.on("zoominto:afterTransitioned", (event) => {
    if (event.futureHomeViewId === zoomingViewId) {
        zoomingViewId = "";
    }
})
eventbus.on("zoomout:afterTransitioned", (event) => {
    if (event.homeNextViewId === zoomingViewId) {
        zoomingViewId = "";
    }
})
function isMeZoomingOut(viewId: string): boolean {
    return zoomingViewId === viewId;
}

export class TodoTransitionActions implements TodoLifeCycle {

    // states: 供UI使用, 当外部变动时, 这些值将会变动
    public $todoViewTransitionName: `todoView_${string}` | "none";
    public $titleViewTransitionName: `titleView_${string}` | "none";
    public $todoListViewTransitionName: `todoListView_${string}` | "none";

    constructor(
        public host: TodoController,
    ) {
        // 注意$state只能一次性赋值, 不能使用if/else, 如果要增加复杂逻辑, 需要封装一个函数, 然后一把设置为函数返回值

        // 初始化时检查自己是否是新被tab进来的, 要设置整个Todo的ViewTransitionName
        this.$todoViewTransitionName = $state(this.getInitTodoViewTransitionName());
        this.$todoListViewTransitionName = $state(this.getInitTodoListTransitionName());
        this.$titleViewTransitionName = $state(this.getInitTitleViewTransitionName());

        // 事件挂载
        eventbus.on('zoomout:beforeStart', this.onBeforeZoomOutStart);
        eventbus.on('zoomout:afterTransitioned', this.onAfterZoomOutTransitioned);
        eventbus.on('zoominto:afterTransitioned', this.onAfterZoomIntoTransitioned);
    }

    public onTodoReady() {
        this.onAfterTabNewTodoMounted();
    }

    public destroy() {
        // 事件卸载
        eventbus.off('zoomout:beforeStart', this.onBeforeZoomOutStart);
        eventbus.off('zoomout:afterTransitioned', this.onAfterZoomOutTransitioned);
        eventbus.off('zoominto:afterTransitioned', this.onAfterZoomIntoTransitioned);
    }

    private get cursor() {
        return this.host.panel.interaction.cursor;
    }

    private getInitTodoViewTransitionName(): typeof this.$todoViewTransitionName {
        if (this.host.isRoot() || this.cursor.isTabbing(this.host.viewId)) {
            console.log(`init todoview: todoView_${this.host.viewId}`)
            return `todoView_${this.host.viewId}`;
        }

        return "none";
    }

    private getInitTodoListTransitionName(): typeof this.$todoListViewTransitionName {
        if (this.host.isRoot()) {
            return `todoListView_${this.host.viewId}`;
        }

        if (isMeZoomingOut(this.host.viewId)) {
            return `todoListView_${this.host.viewId}`;
        }

        return "none";
    }

    private getInitTitleViewTransitionName(): typeof this.$titleViewTransitionName {
        if (this.host.isRoot() || isMeZoomingOut(this.host.viewId)) {
            return `titleView_${this.host.viewId}`;
        }
        return "none";
    }

    ///////
    // zoomout操作
    ///////
    public onBeforeZoomOutStart = ({ homeNextViewId }: Events['zoomout:beforeStart']) => {
        if (this.host.isRoot()) {
            console.log(`zoomout:beforeStart-:${homeNextViewId}`);
            // 1. 设置title的viewTransitionName为nextViewId
            this.$titleViewTransitionName = `titleView_${homeNextViewId}`;

            // 2. 设置list的viewTransitionName为nextViewId
            this.$todoListViewTransitionName = `todoListView_${homeNextViewId}`;

            // 3. 保存
            zoomingViewId = homeNextViewId;
        }
    }

    public onAfterZoomOutTransitioned = ({ homeNextViewId }: Events['zoomout:afterTransitioned']) => {
        if (homeNextViewId === this.host.viewId) {
            this.$titleViewTransitionName = "none";
            this.$todoListViewTransitionName = "none";
        }
    }

    public onAfterZoomIntoTransitioned = (event: Events['zoominto:afterTransitioned']) => {
        if (event.futureHomeViewId === this.host.viewId) {
            this.$titleViewTransitionName = "none";
            this.$todoListViewTransitionName = "none";
        }
    }

    public async withZoomIntoTransition(doZoomInto: () => void) {
        // before: 计算后面的viewId
        const futureViewId = makeViewId(this.host.panel.id, this.host.task.id);
        this.$titleViewTransitionName = `titleView_${futureViewId}`;
        this.$todoListViewTransitionName = `todoListView_${futureViewId}`;
        eventbus.emit('zoominto:beforeStart', { futureHomeViewId: futureViewId, zoomingViewId: this.host.viewId });
        await tick();
        const transition = document.startViewTransition(() => {
            doZoomInto();
        });

        await transition.finished;
        eventbus.emit('zoominto:afterTransitioned', { futureHomeViewId: futureViewId, zoomingViewId: this.host.viewId });
    }

    ///////
    // tab操作
    ///////
    public onBeforeTabStart = (event: { originViewId: string; nextViewId: string; cursorIndex: number }) => {
        if (event.originViewId !== this.host.viewId) {
            return;
        }

        this.$todoViewTransitionName = `todoView_${event.nextViewId}`;
        console.log(`beforeStart:todoView:${this.$todoViewTransitionName}`);
    }

    public onAfterTabNewTodoMounted = () => {
        const cursorIndex = this.cursor.consumeTabCursor(this.host.viewId);
        if (cursorIndex !== undefined) {
            this.host.focusActions.onfocus(cursorIndex);
        }
    }

    public withAllTodoListTransition(action: () => void) {
        action();
    }
}
