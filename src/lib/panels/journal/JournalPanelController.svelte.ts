import type { TodoLifeCycle } from "$lib/components/todolist/controller/ILifeCycle.svelte";
import type { PanelController } from "$lib/components/todolist/controller/IPanelController.svelte";
import { TodoController } from "$lib/components/todolist/controller/TodoController.svelte";
import type { Journal } from "$lib/states/meta/journal.svelte";
import type { Task } from "$lib/states/meta/task.svelte";
import type { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
import type { Store } from "$lib/states/meta/store.svelte";
import dayjs from "dayjs";
import { range } from "radash";

abstract class JournalPanelController implements TodoLifeCycle, PanelController {
    public constructor(
        public readonly id: string,
        public readonly panelStateStore: PanelStateStore,
        public readonly rootTaskId: string,
        public readonly store: Store,
    ) { }

    public onTodoReady() { }
    public destory() { }

    pushPaths(childPaths: Task[]): void {
        throw new Error("Method not implemented.");
    }

    zoomable() {
        return false;
    }

    public abstract getJournalList(): Journal[];

    public getTodoController(journal: Journal): TodoController {
        const task = journal.task;
        if (!task) {
            throw new Error("Journal task is undefined");
        }
        const homeStateTree = this.panelStateStore.createHomeByPaths([task]);
        return TodoController.createRoot(this, task, homeStateTree);
    }

}

export class WeeklyJournalPanelController extends JournalPanelController {

    public constructor(
        id: string,
        panelStateStore: PanelStateStore,
        rootTaskId: string,
        store: Store,
    ) {
        super(id, panelStateStore, rootTaskId, store);
    }

    public getJournalList(): Journal[] {
        return this.genTimes().map((time) => {
            return this.store.getOrCreateJournal(
                `${time.valueOf()}-WEEK`,
                time.valueOf(),
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
        store: Store,
    ) {
        super(id, panelStateStore, rootTaskId, store);
    }

    public getJournalList(): Journal[] {
        return this.genTimes().map((time) => {
            return this.store.getOrCreateJournal(
                `${time.valueOf()}-DAY`,
                time.valueOf(),
                "DAY",
                time.format("MM/DD"),
                `${time.format("YYYY-MM-DD")}`,
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