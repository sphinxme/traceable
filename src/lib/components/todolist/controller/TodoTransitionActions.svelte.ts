import { tick } from "svelte";
import { eventbus, type Events } from "./eventbus.svelte";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import { makeViewId } from "./utils";

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
            return `todoView_${this.host.viewId}`;
        }

        return "none";
    }

    private getInitTodoListTransitionName(): typeof this.$todoListViewTransitionName {
        if (this.host.isRoot()) {
            return `todoListView_${this.host.viewId}`;
        }

        if (this.cursor.isZoomingOut(this.host.viewId)) {
            return `todoListView_${this.host.viewId}`;
        }

        return "none";
    }

    private getInitTitleViewTransitionName(): typeof this.$titleViewTransitionName {
        if (this.host.isRoot() || this.cursor.isZoomingOut(this.host.viewId)) {
            return `titleView_${this.host.viewId}`;
        }
        return "none";
    }

    ///////
    // zoomout操作
    ///////
    public onBeforeZoomOutStart = ({ homeNextViewId }: Events['zoomout:beforeStart']) => {
        if (this.host.isRoot()) {
            // 1. 设置title的viewTransitionName为nextViewId
            this.$titleViewTransitionName = `titleView_${homeNextViewId}`;

            // 2. 设置list的viewTransitionName为nextViewId
            this.$todoListViewTransitionName = `todoListView_${homeNextViewId}`;

            // 3. 保存(cursor state 由 EditorPanelController.withZoomoutTransition 调用 cursor.startZoomout 设置)
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
        this.cursor.startZoominto(futureViewId);
        await tick();
        const transition = document.startViewTransition(() => {
            doZoomInto();
        });

        await transition.finished;
        eventbus.emit('zoominto:afterTransitioned', { futureHomeViewId: futureViewId, zoomingViewId: this.host.viewId });
        this.cursor.endZoominto(futureViewId);
    }

    ///////
    // tab操作
    ///////
    public onBeforeTabStart = (event: { originViewId: string; nextViewId: string; cursorIndex: number }) => {
        if (event.originViewId !== this.host.viewId) {
            return;
        }

        this.$todoViewTransitionName = `todoView_${event.nextViewId}`;
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
