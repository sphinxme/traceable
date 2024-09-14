import * as Y from "yjs";
import type { Dayjs } from "dayjs";
import { type Database } from "$lib/states/db";

export class TaskEventGroup {
    db: Database;

    taskId: string;
    directChildrenTaskIds: Y.Array<string>;
    myEventIds: Y.Array<string>;

    // 内部状态 byTaskId
    subGroups: Map<string, TaskEventGroup> = new Map();

    currentInterestedEventsByTaskId: Map<string, string[]> = new Map();
    callback: ((eventIds: string[]) => void) | undefined;

    // 当前状态(更改前的状态 用于diff)
    currentChildrenTasks: string[];

    unobserve: () => void;

    constructor(
        db: Database,
        taskId: string,
        callback?: (eventIds: string[]) => void,
    ) {
        this.db = db;
        this.taskId = taskId;
        this.directChildrenTaskIds = this.oldDB.getTaskChildren(taskId);
        this.myEventIds = this.oldDB.getTaskEvents(taskId);
        this.currentInterestedEventsByTaskId.set(
            taskId,
            this.myEventIds.toArray(),
        );
        this.currentChildrenTasks = this.directChildrenTaskIds.toArray();
        if (callback) {
            this.callback = callback;
        }

        this.currentChildrenTasks.forEach((childTaskId) => {
            const sub = new TaskEventGroup(
                db,
                childTaskId,
                (eventIds: string[]) => {
                    this.onSubEventsChange(childTaskId, eventIds);
                },
            );
            this.subGroups.set(childTaskId, sub);
        });

        const childTaskObserver = (
            yEvent: Y.YArrayEvent<string>,
            transaction: Y.Transaction,
        ) => {
            this.onChildTaskUpdate(yEvent, transaction);
        };
        const myEventTaskObserver = (
            yEvent: Y.YArrayEvent<string>,
            transaction: Y.Transaction,
        ) => {
            this.onMyEventsUpdate(yEvent, transaction);
        };

        this.directChildrenTaskIds.observe(childTaskObserver);
        this.myEventIds.observe(myEventTaskObserver);

        this.unobserve = () => {
            this.directChildrenTaskIds.unobserve(childTaskObserver);
            this.myEventIds.unobserve(myEventTaskObserver);
        };
    }
    // 节点发生变化的更新不一定有的
    fetchAllEvents(): string[] {
        const results = new Set<string>();
        // 获取自己的
        const myEvents = this.myEventIds.toArray();
        this.currentInterestedEventsByTaskId.set(this.taskId, myEvents);
        myEvents.forEach((e) => {
            results.add(e);
        });

        // 获取小弟的
        this.subGroups.forEach((sub, taskId) => {
            const events = sub.fetchAllEvents();
            this.currentInterestedEventsByTaskId.set(taskId, events);
            events.forEach((e) => {
                results.add(e);
            });
        });

        return [...results];
    }

    destory() {
        this.unobserve();
        this.subGroups.forEach((sub) => sub.destory());
    }

    // private
    private onMyEventsUpdate(
        yEvent: Y.YArrayEvent<string>,
        transaction: Y.Transaction,
    ) {
        const before = this.currentInterestedEventsByTaskId.get(this.taskId)!;
        const now = this.myEventIds.toArray();

        const { changed } = diff(before, now);

        if (changed) {
            this.currentInterestedEventsByTaskId.set(this.taskId, now);
            this.notify();
        }
    }

    private onSubEventsChange(childTaskId: string, eventIds: string[]) {
        this.currentInterestedEventsByTaskId.set(childTaskId, eventIds);
        this.notify();
    }

    private onChildTaskUpdate(
        yEvent: Y.YArrayEvent<string>,
        transaction: Y.Transaction,
    ) {
        const before = this.currentChildrenTasks;
        const now = this.directChildrenTaskIds.toArray();

        const { added, deleted, changed } = diff(before, now);
        if (changed) {
            this.currentChildrenTasks = now;

            added.forEach((taskId) => {
                const callback = (eventIds: string[]) =>
                    this.onSubEventsChange(taskId, eventIds);
                const sub = new TaskEventGroup(this.oldDB, taskId, callback);
                this.subGroups.set(taskId, sub);
                this.currentInterestedEventsByTaskId.set(
                    taskId,
                    sub.fetchAllEvents(),
                );
            });

            deleted.forEach((taskId) => {
                const sub = this.subGroups.get(taskId);
                if (!sub) {
                    return;
                }
                sub.destory();
                this.subGroups.delete(taskId);
                this.currentInterestedEventsByTaskId.delete(taskId);
            });

            this.notify();
        }
    }

    private notify() {
        if (this.callback) {
            const results = new Set<string>();
            this.currentInterestedEventsByTaskId
                .forEach((eventIds) =>
                    eventIds.forEach((eventId) => {
                        results.add(eventId);
                    })
                );
            this.callback([...results]);
        }
    }
}

export function diff<T>(
    before: T[],
    now: T[],
): { added: T[]; deleted: T[]; changed: boolean } {
    const added = inANotInB(now, before);
    const deleted = inANotInB(before, now);

    return {
        added,
        deleted,
        changed: Boolean(added.length) || Boolean(deleted.length),
    };
}

function inANotInB<T>(a: T[], b: T[]): T[] {
    const setB = new Set(b);
    return a.filter((e) => !setB.has(e));
}
