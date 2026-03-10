import * as Y from "yjs";
import type { Store } from "./store.svelte";
import { createYMapSubscriber } from "./reactive-yjs";
import { ReactiveYArrayProxy } from "./reactive-yarray";
import type { Event } from "./event.svelte";

export class Task {
    readonly yMap: Y.Map<any>;
    private readonly store: Store;
    private readonly subscribe: () => void;

    private _children?: ReactiveYArrayProxy<Task>;
    private _parents?: ReactiveYArrayProxy<Task>;
    private _events?: ReactiveYArrayProxy<Event>;

    static readonly __isTaskProxy = true;

    constructor(yMap: Y.Map<any>, store: Store) {
        this.yMap = yMap;
        this.store = store;
        this.subscribe = createYMapSubscriber(yMap);
    }

    get id(): string {
        this.subscribe();
        return this.yMap.get("id");
    }

    get textId(): string {
        this.subscribe();
        return this.yMap.get("textId");
    }

    get noteId(): string {
        this.subscribe();
        return this.yMap.get("noteId");
    }

    get noteDoc(): Y.Doc {
        this.subscribe();
        return this.yMap.get("noteDoc");
    }

    get text(): Y.Text {
        this.subscribe();
        const textId = this.yMap.get("textId");
        return this.store.getText(textId)!;
    }

    get note(): Y.Text {
        this.subscribe();
        const noteId = this.yMap.get("noteId");
        return this.store.getText(noteId)!;
    }

    get status(): "DONE" | "TODO" | "BLOCKED" {
        this.subscribe();
        return this.yMap.get("status");
    }

    set status(value: "DONE" | "TODO" | "BLOCKED") {
        this.yMap.set("status", value);
    }

    done() {
        this.status = "DONE";
    }

    toggleStatus() {
        this.status = this.status === "DONE" ? "TODO" : "DONE";
    }

    get isCompleted(): boolean {
        return this.status === "DONE";
    }

    get children(): ReactiveYArrayProxy<Task> {
        this.subscribe();
        if (!this._children) {
            const yArray = this.yMap.get("children") as Y.Array<string>;
            this._children = new ReactiveYArrayProxy<Task>(yArray, (taskId) => this.store.getTask(taskId));
        }
        return this._children;
    }

    get parents(): ReactiveYArrayProxy<Task> {
        this.subscribe();
        if (!this._parents) {
            const yArray = this.yMap.get("parents") as Y.Array<string>;
            this._parents = new ReactiveYArrayProxy<Task>(yArray, (taskId) => this.store.getTask(taskId));
        }
        return this._parents;
    }

    get events(): ReactiveYArrayProxy<Event> {
        this.subscribe();
        if (!this._events) {
            const yArray = this.yMap.get("events") as Y.Array<string>;
            this._events = new ReactiveYArrayProxy<Event>(yArray, (eventId) => this.store.getEvent(eventId));
        }
        return this._events;
    }

    hasChildren(): boolean {
        return !this.children.isEmpty();
    }

    attachChild(child: Task, index?: number) {
        if (child.parents.includes(this.id)) {
            throw new Error("duplicate child in one parent");
        }
        this.store.doc.transact(() => {
            child.parents._attach(this.id);
            this.children._attach(child.id, index);
        });
    }

    insertChild(index?: number, text: string = "", note: string = "") {
        const child = this.store.createTask(text, note);
        this.attachChild(child, index);
        return child;
    }

    detachChild(child: Task) {
        this.store.doc.transact(() => {
            child.parents._detach(this.id);
            this.children._detach(child.id);
        });
    }

    deleteChild(child: Task) {
        if (child.parents.length > 1) {
            this.store.doc.transact(() => {
                child.parents._detach(this.id);
                this.children._detach(child.id);
            });
            return;
        }

        this.store.doc.transact(() => {
            this.children._detach(child.id);
            this.store.deleteTask(child.id);
        });
    }

    insertEvent(start: number, end: number) {
        const event = this.store.createEvent(this.id, start, end);
        return event;
    }

    detachEvent(eventId: string) {
        this.events._detach(eventId);
    }

    toJSON(): Record<string, any> {
        return {
            id: this.id,
            textId: this.textId,
            noteId: this.noteId,
            status: this.status,
            children: this.children.toIds(),
            parents: this.parents.toIds(),
            events: this.events.toIds(),
        };
    }
}

export type TaskProxy = Task;
