import type { Task } from "$lib/states/meta/task.svelte";
import mitt, { type Emitter } from "mitt";

/**
 * Todo 大纲组件内部事件总线的事件类型定义。
 *
 * 此总线用于 todolist 组件内部的跨组件通信，主要服务于缩放过渡和拖拽。
 * 与 `interaction/eventbus.svelte.ts` 中的 `interactionBus` 分离，
 * 避免反向依赖（interaction/services → todolist/controller）。
 *
 * 事件流：
 * - 缩放退出：`zoomout:beforeStart` → （View Transition 动画）→ `zoomout:afterTransitioned`
 * - 缩放进入：`withZoomIntoTransition` → （View Transition 动画）→ `zoominto:afterTransitioned`
 * - 拖拽：`drag:start` → ... → `drag:end`
 */
export type Events = {
    /** 缩放退出过渡开始前（由 `EditorPanelController.withZoomoutTransition` 发射） */
    'zoomout:beforeStart': { homeNextViewId: string };
    /** 缩放退出过渡完成后（由 `EditorPanelController.withZoomoutTransition` 发射） */
    'zoomout:afterTransitioned': { homeNextViewId: string };

    /** 缩放进入过渡完成后（由 `TodoTransitionActions.withZoomIntoTransition` 发射） */
    'zoominto:afterTransitioned': { zoomingViewId: string, futureHomeViewId: string };

    /** 拖拽开始（由 `DragDropActions.startDrag` 发射） */
    'drag:start': { originPanelId: string, originViewId: string, task: Task };
    /** 拖拽结束（由 `DragDropActions.endDrag` 发射） */
    'drag:end': { originPanelId: string, originViewId: string, task: Task };
};

/**
 * Todo 大纲组件内部事件总线单例（基于 mitt）。
 */
export const eventbus: Emitter<Events> = mitt<Events>();

/**
 * 在 `$effect` 中注册事件总线监听，自动在组件销毁时退订。
 *
 * @example
 * ```ts
 * eventbus$listen('drag:start', (event) => { ... });
 * ```
 *
 * @param event 事件名称
 * @param handler 事件处理器
 */
export function eventbus$listen<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void) {
    $effect(() => {
        eventbus.on(event, handler);
        return () => {
            eventbus.off(event, handler);
        }
    })
}