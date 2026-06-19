import * as Y from "yjs";
import { Task } from "./task.svelte";
import { Event } from "./event.svelte";
import { Journal } from "./journal.svelte";
import { createYMapKeysSubscriber } from "./reactive-yjs";
import { id } from "./utils";

export class Store {
    readonly doc: Y.Doc;
    readonly tasks: Y.Map<Y.Map<any>>;
    readonly texts: Y.Map<Y.Text>;
    readonly journals: Y.Map<Y.Map<any>>;
    readonly events: Y.Map<Y.Map<any>>;
    readonly panelStates: Y.Map<any>;
    readonly user: Y.Map<any>;

    private taskCache = new Map<string, Task>();
    private eventCache = new Map<string, Event>();
    private journalCache = new Map<string, Journal>();

    private readonly subscribeTasksMap: () => void;
    private readonly subscribeEventsMap: () => void;

    constructor(doc: Y.Doc) {
        this.doc = doc;
        this.tasks = doc.getMap("tasks");
        this.texts = doc.getMap("texts");
        this.journals = doc.getMap("journals");
        this.events = doc.getMap("events");
        this.panelStates = doc.getMap("panelStates");
        this.user = doc.getMap("user");

        this.subscribeTasksMap = createYMapKeysSubscriber(this.tasks);
        this.subscribeEventsMap = createYMapKeysSubscriber(this.events);
    }

    clear() {
        this.doc.transact(() => {
            this.tasks.clear();
            this.texts.clear();
            this.journals.clear();
            this.events.clear();
            this.panelStates.clear();
            this.user.clear();
        });
    }

    getTask(id: string): Task | undefined {
        const yMap = this.tasks.get(id);
        if (!yMap) {
            this.taskCache.delete(id);
            return undefined;
        }

        let task = this.taskCache.get(id);
        if (!task) {
            task = new Task(yMap, this);
            this.taskCache.set(id, task);
        }
        return task;
    }

    createTask(text = ""): Task {
        const textId = this.createText(text);
        const taskId = id();

        this.doc.transact(() => {
            const taskYMap = new Y.Map();
            taskYMap.set("id", taskId);
            taskYMap.set("textId", textId);
            taskYMap.set("noteDoc", new Y.XmlFragment());
            taskYMap.set("children", new Y.Array());
            taskYMap.set("parents", new Y.Array());
            taskYMap.set("events", new Y.Array());
            taskYMap.set("status", "TODO");

            this.tasks.set(taskId, taskYMap);
        });

        return this.getTask(taskId)!;
    }

    deleteTask(id: string): void {
        const task = this.getTask(id);
        if (!task) return;

        this.doc.transact(() => {
            const taskYMap = this.tasks.get(id);
            if (taskYMap) {
                const noteDoc = taskYMap.get("noteDoc");
                if (noteDoc) {
                    noteDoc.destroy();
                }

                const textId = taskYMap.get("textId");
                if (textId) this.texts.delete(textId);

                const parents = (taskYMap.get("parents") as Y.Array<string>).toArray();
                for (const parentId of parents) {
                    const parentYMap = this.tasks.get(parentId);
                    if (parentYMap) {
                        const childrenArr = parentYMap.get("children") as Y.Array<string>;
                        const idx = childrenArr.toArray().indexOf(id);
                        if (idx !== -1) childrenArr.delete(idx, 1);
                    }
                }

                const children = (taskYMap.get("children") as Y.Array<string>).toArray();
                for (const childId of children) {
                    const childYMap = this.tasks.get(childId);
                    if (childYMap) {
                        const parentsArr = childYMap.get("parents") as Y.Array<string>;
                        const idx = parentsArr.toArray().indexOf(id);
                        if (idx !== -1) parentsArr.delete(idx, 1);
                    }
                }

                const eventIds = (taskYMap.get("events") as Y.Array<string>).toArray();
                for (const eventId of eventIds) {
                    this.events.delete(eventId);
                    this.eventCache.delete(eventId);
                }

                this.tasks.delete(id);
                this.taskCache.delete(id);
            }
        });
    }

    get allTasks(): Task[] {
        this.subscribeTasksMap();
        const result: Task[] = [];
        for (const [id] of this.tasks) {
            const task = this.getTask(id);
            if (task) result.push(task);
        }
        return result;
    }

    getText(textId: string): Y.Text | undefined {
        return this.texts.get(textId);
    }

    createText(text?: string): string {
        const textId = id();
        const yText = new Y.Text(text);
        this.texts.set(textId, yText);
        return textId;
    }

    deleteText(textId: string): void {
        this.texts.delete(textId);
    }

    getEvent(id: string): Event | undefined {
        const yMap = this.events.get(id);
        if (!yMap) {
            this.eventCache.delete(id);
            return undefined;
        }

        let event = this.eventCache.get(id);
        if (!event) {
            event = new Event(yMap, this);
            this.eventCache.set(id, event);
        }
        return event;
    }

    createEvent(taskId: string, start: number, end: number): Event {
        const eventId = id();

        this.doc.transact(() => {
            const eventYMap = new Y.Map();
            eventYMap.set("id", eventId);
            eventYMap.set("taskId", taskId);
            eventYMap.set("start", start);
            eventYMap.set("end", end);

            this.events.set(eventId, eventYMap);

            const taskYMap = this.tasks.get(taskId);
            if (taskYMap) {
                const eventsArray = taskYMap.get("events") as Y.Array<string>;
                eventsArray.push([eventId]);
            }
        });

        return this.getEvent(eventId)!;
    }

    deleteEvent(id: string): void {
        const event = this.getEvent(id);
        if (!event) return;

        this.doc.transact(() => {
            const eventYMap = this.events.get(id);
            if (eventYMap) {
                const taskId = eventYMap.get("taskId");
                const taskYMap = this.tasks.get(taskId);
                if (taskYMap) {
                    const eventsArr = taskYMap.get("events") as Y.Array<string>;
                    const idx = eventsArr.toArray().indexOf(id);
                    if (idx !== -1) eventsArr.delete(idx, 1);
                }

                this.events.delete(id);
                this.eventCache.delete(id);
            }
        });
    }

    get allEvents(): Event[] {
        this.subscribeEventsMap();
        const result: Event[] = [];
        for (const [id] of this.events) {
            const event = this.getEvent(id);
            if (event) result.push(event);
        }
        return result;
    }

    queryEventsByRange(from: number, to: number): Event[] {
        this.subscribeEventsMap();
        const result: Event[] = [];
        for (const [id, yEvent] of this.events) {
            const start = yEvent.get("start") as number;
            if (from < start && start < to) {
                const event = this.getEvent(id);
                if (event) result.push(event);
            }
        }
        return result;
    }

    getJournal(key: string): Journal | undefined {
        const yMap = this.journals.get(key);
        if (!yMap) {
            this.journalCache.delete(key);
            return undefined;
        }

        let journal = this.journalCache.get(key);
        if (!journal) {
            journal = new Journal(yMap, this);
            this.journalCache.set(key, journal);
        }
        return journal;
    }

    getOrCreateJournal(key: string, time: number, type: "WEEK" | "DAY", text: string): Journal {
        let journal = this.getJournal(key);
        if (journal) return journal;

        const task = this.createTask(text);

        this.doc.transact(() => {
            const journalYMap = new Y.Map();
            journalYMap.set("id", key);
            journalYMap.set("type", type);
            journalYMap.set("taskId", task.id);
            journalYMap.set("time", time);
            this.journals.set(key, journalYMap);
        });

        return this.getJournal(key)!;
    }

    get rootTaskId(): string {
        return this.user.get("rootTaskId");
    }

    set rootTaskId(value: string) {
        this.user.set("rootTaskId", value);
    }

    get rootTask(): Task | undefined {
        const rootTaskId = this.rootTaskId;
        if (!rootTaskId) {
            const task = this.createTask("ROOT");
            this.rootTaskId = task.id;
            return task;
        }
        return this.getTask(rootTaskId);
    }

    pruneCache(): void {
        for (const [id] of this.taskCache) {
            if (!this.tasks.has(id)) this.taskCache.delete(id);
        }
        for (const [id] of this.eventCache) {
            if (!this.events.has(id)) this.eventCache.delete(id);
        }
        for (const [id] of this.journalCache) {
            if (!this.journals.has(id)) this.journalCache.delete(id);
        }
    }
}
