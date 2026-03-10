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

    readonly id: string;
    readonly taskId: string;
    readonly task: Task;
    readonly type: JournalType;

    constructor(yMap: Y.Map<any>, store: Store) {
        this.yMap = yMap;
        this.store = store;
        this.subscribe = createYMapSubscriber(yMap);

        this.id = this.yMap.get("id");
        this.taskId = this.yMap.get("taskId");
        this.task = this.store.getTask(this.taskId)!;
        this.type = this.yMap.get("type");
    }

    get time(): Dayjs {
        this.subscribe();
        return dayjs(this.yMap.get("time") as number);
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
