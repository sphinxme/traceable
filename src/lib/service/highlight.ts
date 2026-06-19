import { eventbus, type Events } from "$lib/components/todolist/controller/eventbus";

export class HighlightService {

    public constructor() {
        eventbus.on('clickOnWeekEvent', this.onClickWeekEvent);
    }

    // 实际上用不到
    public destroy() {
        eventbus.off('clickOnWeekEvent', this.onClickWeekEvent);
    }

    private onClickWeekEvent = (event: Events['clickOnWeekEvent']) => {
        // TODO: Stage 1~2 接 pluggable 处理(原实现是 stray 语句 `panel.id`,无实际行为)
    }

}

export const highlightService = new HighlightService();