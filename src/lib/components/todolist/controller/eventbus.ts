import type { Event } from "$lib/states/meta/event.svelte";
import type { Task } from "$lib/states/meta/task.svelte";
import mitt, { type Emitter } from "mitt";
import type { PanelController } from "./IPanelController.svelte";

export type Events = {
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