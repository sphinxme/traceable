import { tick } from "svelte";
import { eventbus, type Events } from "./eventbus.svelte";
import type { TodoLifeCycle } from "./ILifeCycle.svelte";
import type { TodoController } from "./TodoController.svelte";
import { makeViewId } from "./utils";

/**
 * Todo 缩放过渡处理器 — 管理 View Transition 动画命名与协调。
 *
 * 使用浏览器原生 `document.startViewTransition` API 实现平滑动画。
 * 通过动态设置 CSS `view-transition-name` 属性来匹配动画前后的元素。
 *
 * **三个 TransitionName 状态**：
 * - `$todoViewTransitionName` — 整个 Todo 条目（用于 Tab/Untab 时条目移动动画）
 * - `$titleViewTransitionName` — 标题区域（用于缩放时标题 ↔ 条目的形变动画）
 * - `$todoListViewTransitionName` — 子列表区域（用于缩放时列表的展开/收起动画）
 *
 * **动画场景**：
 * 1. **缩放进入**（zoomInto）：标题 → 条目形变，子列表展开
 * 2. **缩放退出**（zoomout）：条目 → 标题形变，子列表收起
 * 3. **Tab/Untab**：条目从原位置移动到新位置
 *
 * 通过 `eventbus` 接收缩放事件，在 `onTodoReady` 中消费 Tab 后的光标恢复。
 */
export class TodoTransitionActions implements TodoLifeCycle {

    // states: 供UI使用, 当外部变动时, 这些值将会变动
    /** 整个 Todo 条目的 View Transition 名称（Tab/Untab 时用于条目移动动画） */
    public $todoViewTransitionName: `todoView_${string}` | "none";
    /** 标题区域的 View Transition 名称（缩放时标题 ↔ 条目形变动画） */
    public $titleViewTransitionName: `titleView_${string}` | "none";
    /** 子列表区域的 View Transition 名称（缩放时列表展开/收起动画） */
    public $todoListViewTransitionName: `todoListView_${string}` | "none";

    /**
     * @param host 关联的 TodoController
     */
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

    /**
     * Todo 就绪后调用 — 消费 Tab 后待处理的光标恢复请求。
     */
    public onTodoReady() {
        this.onAfterTabNewTodoMounted();
    }

    /**
     * 销毁 — 卸载 eventbus 上的缩放事件监听。
     */
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
    /**
     * 缩放退出开始前 — root 控制器设置 title 和 list 的 TransitionName 为下一个 home 的 viewId。
     */
    public onBeforeZoomOutStart = ({ homeNextViewId }: Events['zoomout:beforeStart']) => {
        if (this.host.isRoot()) {
            // 1. 设置title的viewTransitionName为nextViewId
            this.$titleViewTransitionName = `titleView_${homeNextViewId}`;

            // 2. 设置list的viewTransitionName为nextViewId
            this.$todoListViewTransitionName = `todoListView_${homeNextViewId}`;

            // 3. 保存(cursor state 由 EditorPanelController.withZoomoutTransition 调用 cursor.startZoomout 设置)
        }
    }

    /**
     * 缩放退出过渡完成后 — 清除 TransitionName。
     */
    public onAfterZoomOutTransitioned = ({ homeNextViewId }: Events['zoomout:afterTransitioned']) => {
        if (homeNextViewId === this.host.viewId) {
            this.$titleViewTransitionName = "none";
            this.$todoListViewTransitionName = "none";
        }
    }

    /**
     * 缩放进入过渡完成后 — 清除 TransitionName。
     */
    public onAfterZoomIntoTransitioned = (event: Events['zoominto:afterTransitioned']) => {
        if (event.futureHomeViewId === this.host.viewId) {
            this.$titleViewTransitionName = "none";
            this.$todoListViewTransitionName = "none";
        }
    }

    /**
     * 执行缩放进入过渡动画。
     *
     * 1. 计算目标 viewId
     * 2. 设置 title 和 list 的 TransitionName
     * 3. `cursor.startZoominto`
     * 4. `document.startViewTransition` 执行 `doZoomInto`（通常是 `panel.pushPaths`）
     * 5. 过渡完成后 emit `zoominto:afterTransitioned` + `cursor.endZoominto`
     *
     * @param doZoomInto 实际执行缩放的回调（更新面板路径）
     */
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
    /**
     * Tab 操作开始前 — 设置被移动条目的 TransitionName 为目标 viewId。
     */
    public onBeforeTabStart = (event: { originViewId: string; nextViewId: string; cursorIndex: number }) => {
        if (event.originViewId !== this.host.viewId) {
            return;
        }

        this.$todoViewTransitionName = `todoView_${event.nextViewId}`;
    }

    /**
     * Tab 后新 Todo 挂载完成 — 消费待处理的 Tab 光标并恢复焦点。
     */
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
