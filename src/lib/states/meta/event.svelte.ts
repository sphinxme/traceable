import * as Y from "yjs";
import type { Store } from "./store.svelte";
import type { Task } from "./task.svelte";
import { createYMapSubscriber } from "./reactive-yjs";

export type EventProxy = Event;

export class Event {
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

    get taskId(): string {
        this.subscribe();
        return this.yMap.get("taskId");
    }

    set taskId(value: string) {
        this.yMap.set("taskId", value);
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

    get textId(): string {
        this.subscribe();
        return this.yMap.get("textId");
    }

    get task(): Task | undefined {
        this.subscribe();
        const taskId = this.yMap.get("taskId");
        return taskId ? this.store.getTask(taskId) : undefined;
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

    destroy() {
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

    toJSON(): Record<string, any> {
        return {
            id: this.id,
            taskId: this.taskId,
            start: this.start,
            end: this.end,
        };
    }
}
