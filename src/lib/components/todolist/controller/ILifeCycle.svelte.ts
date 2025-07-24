export interface TodoLifeCycle {
    /**
     * Todo.svelte/TodoView.svelte的onMount加载, 并且所有hooks都已挂载好时触发
     */
    onTodoReady(): void;

    /**
     * 需要可重复调用
     */
    destory(): void;
}