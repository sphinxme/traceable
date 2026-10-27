/**
 * Todo 生命周期接口。
 *
 * `TodoController` 及其所有 Action 类均实现此接口，
 * 保证生命周期回调的一致性。
 *
 * 生命周期由 `Todo.svelte` / `TodoView.svelte` 中的 `$effect` 驱动：
 * - 组件 mount 后调用 `onTodoReady()`
 * - 组件 destroy 时调用 `destroy()`
 *
 * `TodoController.onTodoReady()` 会依次调用所有 Action 的 `onTodoReady()`，
 * `destroy()` 同理。
 */
export interface TodoLifeCycle {
    /**
     * Todo.svelte/TodoView.svelte的onMount加载, 并且所有hooks都已挂载好时触发
     *
     * 在此阶段：
     * - 消费待处理的 cursor focus 请求（键盘导航 / 新建 Todo）
     * - 注册视图到 `TaskFocusService`（root controller）
     * - 订阅事件总线（`interactionBus` / `eventbus`）
     * - 设置 View Transition 初始状态
     */
    onTodoReady(): void;

    /**
     * 需要可重复调用
     *
     * 清理资源：退订事件、清除定时器、注销视图注册、从父控制器删除自身。
     */
    destroy(): void;
}