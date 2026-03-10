import * as Y from "yjs";
import type { Store } from "./store.svelte";
import { createYMapSubscriber } from "./reactive-yjs";

export type EventProxy = Event;

export class Event {
    readonly yMap: Y.Map<any>;
    private readonly store: Store;
    private readonly subscribe: () => void;

    readonly id: string;
    readonly taskId: string;
    readonly textId: string;

    constructor(yMap: Y.Map<any>, store: Store) {
        this.yMap = yMap;
        this.store = store;
        this.subscribe = createYMapSubscriber(yMap);

        this.id = this.yMap.get("id");
        this.taskId = this.yMap.get("taskId");
        this.textId = this.yMap.get("textId");
    }

    get start(): number {
        this.subscribe();
        return this.yMap.get("start");
    }

    set start(value: number) {
        this.yMap.set("start", value);
    }

    get end(): number {
        this.subscribe();
        return this.yMap.get("end");
    }

    set end(value: number) {
        if (value === this.end) return;
        this.yMap.set("end", value);
    }

    get task() {
        const task = this.store.getTask(this.taskId);
        if (!task) {
            throw new Error(`invalid taskId: ${this.taskId} from event:${this.id}`);
        }
        return task;
    }

    get duration(): number {
        this.subscribe();
        return this.end - this.start;
    }

    setPeriod(start: number, end: number) {
        this.store.doc.transact(() => {
            this.start = start;
            this.end = end;
        });
    }

    moveTo(start: number) {
        if (start === this.start) return;
        const duration = this.end - this.start;
        this.setPeriod(start, start + duration);
    }

    resizeTo(duration: number) {
        const newEnd = this.start + duration;
        this.end = newEnd;
    }

    delete() {
        this.store.doc.transact(() => {
            const taskId = this.taskId;
            if (taskId) {
                const task = this.store.getTask(taskId);
                if (task) {
                    task.detachEvent(this.id);
                }
            }
            this.store.deleteEvent(this.id);
        });
    }
}
