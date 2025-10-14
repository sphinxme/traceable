import { eventbus, type Events } from "$lib/components/todolist/controller/eventbus";
import type { PanelController } from "$lib/components/todolist/controller/IPanelController.svelte";

export class HighlightService {

    public constructor() {
        eventbus.on('clickOnWeekEvent', this.onClickWeekEvent);
    }

    // 实际上用不到
    public destory() {
        eventbus.off('clickOnWeekEvent', this.onClickWeekEvent);
    }

    private onClickWeekEvent = (event: Events['clickOnWeekEvent']) => {
        // 1. 找到当前所有panel的所有home task
        const panels = new Set<PanelController>();
        eventbus.emit('collectActivePanel', { panelResultSet: panels });
        panels.forEach((panel) => {
            panel.id
        })
    }

}

export const highlightService = new HighlightService();