import type { Event } from "$lib/states/meta/event.svelte";
import type { Task } from "$lib/states/meta/task.svelte";
import mitt, { type Emitter } from "mitt";
import type { PanelController } from "./IPanelController.svelte";

export type Events = {
    'tab:beforeStart': { originViewId: string, nextViewId: string, cursorIndex: number };
    'tab:afterTransitioned': { originViewId: string, nextViewId: string, cursorIndex: number };

    'enter:taskNextFoucs': { newViewId: string, cursorIndex: number };
    // 'enter:atferInsert'
    // 'user:logout': void; // 这个事件不带数据
    // 'notification:show': { type: 'success' | 'error'; message: string };

    'zoomout:beforeStart': { homeNextViewId: string };
    'zoomout:afterTransitioned': { homeNextViewId: string };

    'zoominto:beforeStart': { zoomingViewId: string, futureHomeViewId: string };
    'zoominto:afterTransitioned': { zoomingViewId: string, futureHomeViewId: string };

    'drag:start': { originPanelId: string, originViewId: string, task: Task };
    'drag:end': { originPanelId: string, originViewId: string, task: Task };

    'clickOnWeekEvent': { event: Event, task: Task, clickCount: number };
    'highlight': { viewId: string };
    'collectActivePanel': { panelResultSet: Set<PanelController> }
};

export const eventbus: Emitter<Events> = mitt<Events>();

export function eventbus$listen<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void) {
    $effect(() => {
        eventbus.on(event, handler);
        return () => {
            eventbus.off(event, handler);
        }
    })
}