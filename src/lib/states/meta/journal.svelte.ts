import dayjs, { Dayjs } from "dayjs";
import * as Y from "yjs";
import type { Store } from "./store.svelte";
import type { Task } from "./task.svelte";
import { createYMapSubscriber } from "./reactive-yjs";

export type JournalType = "WEEK" | "DAY";

export type JournalProxy = Journal;

export class Journal {
    readonly yMap: Y.Map<any>;
    private readonly store: Store;
    private readonly subscribe: () => void;

    constructor(yMap: Y.Map<any>, store: Store) {
        this.yMap = yMap;
        this.store = store;
        this.subscribe = createYMapSubscriber(yMap);
    }

    get id(): string {
        this.subscribe();
        return this.yMap.get("id");
    }

    get time(): Dayjs {
        this.subscribe();
        return dayjs(this.yMap.get("time") as number);
    }

    get type(): JournalType {
        this.subscribe();
        return this.yMap.get("type");
    }

    get taskId(): string {
        this.subscribe();
        return this.yMap.get("taskId");
    }

    get task(): Task | undefined {
        this.subscribe();
        const taskId = this.yMap.get("taskId");
        return taskId ? this.store.getTask(taskId) : undefined;
    }

    static genKey(time: Dayjs, type: JournalType): string {
        return `${time.valueOf()}-${type}`;
    }

    toJSON(): Record<string, any> {
        return {
            id: this.id,
            type: this.type,
            taskId: this.taskId,
            time: this.time.valueOf(),
        };
    }
}
