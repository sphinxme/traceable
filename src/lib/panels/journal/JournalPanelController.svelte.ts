import type { TodoLifeCycle } from "$lib/components/todolist/controller/ILifeCycle.svelte";
import type { PanelController } from "$lib/components/todolist/controller/IPanelController.svelte";
import { TodoController } from "$lib/components/todolist/controller/TodoController.svelte";
import type { JournalProxyManager, JournalProxy } from "$lib/states/meta/journal.svelte";
import type { TaskProxy } from "$lib/states/meta/task.svelte";
import type { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
import dayjs from "dayjs";
import { range } from "radash";

abstract class JournalPanelController implements TodoLifeCycle, PanelController {
    public constructor(
        public readonly id: string,
        public readonly panelStateStore: PanelStateStore,
        public readonly rootTaskId: string,
        public readonly db: JournalProxyManager,
    ) { }

    public onTodoReady() { }
    public destory() { }

    pushPaths(childPaths: TaskProxy[]): void {
        throw new Error("Method not implemented.");
    }

    zoomable() {
        return false;
    }

    public abstract getJournalList(): JournalProxy[];

    public getTodoController(journal: JournalProxy): TodoController {
        const homeStateTree = this.panelStateStore.createHomeByPaths([journal.task]);
        return TodoController.createRoot(this, journal.task, homeStateTree);
    }

}

export class WeeklyJournalPanelController extends JournalPanelController {

    public constructor(
        id: string,
        panelStateStore: PanelStateStore,
        rootTaskId: string,
        db: JournalProxyManager,
    ) {
        super(id, panelStateStore, rootTaskId, db);
    }

    public getJournalList(): JournalProxy[] {
        return this.genTimes().map((time) => {
            return this.db.getOrCreateJournal(
                time,
                "WEEK",
                time.format("MM/DD"),
                `${time.format("YYYY-MM-DD")} - ${time.add(1, "week").format("YYYY-MM-DD")}`,
            );
        });
    }

    private genTimes() {
        const start = dayjs().startOf("week").add(7, "day");
        return [...range(-7, 7)].map((offset) =>
            start.subtract(offset, "week"),
        );
    }

}

export class DailyJournalPanelController extends JournalPanelController {

    public constructor(
        id: string,
        panelStateStore: PanelStateStore,
        rootTaskId: string,
        db: JournalProxyManager,
    ) {
        super(id, panelStateStore, rootTaskId, db);
    }

    public getJournalList(): JournalProxy[] {
        return this.genTimes().map((time) => {
            return this.db.getOrCreateJournal(
                time,
                "DAY",
                time.format("MM/DD"),
                `${time.format("YYYY-MM-DD")}}`,
            );
        });
    }

    private genTimes() {
        const start = dayjs().startOf("day").add(7, "day");
        return [...range(-7, 7)].map((offset) =>
            start.subtract(offset, "day"),
        );
    }

}