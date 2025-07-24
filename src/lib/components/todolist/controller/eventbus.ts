import mitt, { type Emitter } from "mitt";

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

    'drag:start': { originPanelId: string, originViewId: string };
    'drag:end': { originPanelId: string, originViewId: string };
};

export const eventbus: Emitter<Events> = mitt<Events>();