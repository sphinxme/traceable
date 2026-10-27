import * as Y from "yjs";
import type { Store } from "./store.svelte";
import { createYMapSubscriber, createYTextSubscriber, createYXmlFragmentDeepSubscriber } from "./reactive-yjs";
import { ReactiveYArrayProxy } from "./reactive-yarray";
import type { Event } from "./event.svelte";

export class Task {
    readonly yMap: Y.Map<any>;
    private readonly store: Store;
    private readonly subscribe: () => void;
    private readonly subscribeText: () => void;
    private readonly subscribeNote: () => void;

    private _children?: ReactiveYArrayProxy<Task>;
    private _parents?: ReactiveYArrayProxy<Task>;
    private _events?: ReactiveYArrayProxy<Event>;

    static readonly __isTaskProxy = true;

    readonly id: string;
    readonly textId: string;
    readonly text: Y.Text;

    readonly noteDoc: Y.XmlFragment;

    constructor(yMap: Y.Map<any>, store: Store) {
        this.yMap = yMap;
        this.store = store;
        this.subscribe = createYMapSubscriber(yMap);

        this.id = this.yMap.get("id");
        this.textId = this.yMap.get("textId");
        this.text = this.store.getText(this.textId)!;

        this.noteDoc = this.yMap.get("noteDoc");

        this.subscribeText = createYTextSubscriber(this.text);
        this.subscribeNote = createYXmlFragmentDeepSubscriber(this.noteDoc);
    }

    get $text() {
        this.subscribeText();
        return this.text.toJSON();
    }

    get $note() {
        this.subscribeNote();
        const noteDoc = this.noteDoc;
        if (!noteDoc) return '';

        const xmlFragment = noteDoc;
        let firstTextFound = false;
        let result = '';

        for (const child of xmlFragment.toArray()) {
            const text = this.extractTextFromNode(child);
            if (text.trim()) {
                if (!firstTextFound) {
                    firstTextFound = true;
                    result = text.trim();
                } else {
                    return result + '...';
                }
            } else if (child instanceof Y.XmlElement && child.nodeName === 'image') {
                if (!firstTextFound) {
                    firstTextFound = true;
                    result = '[图片]';
                } else {
                    return result + '...';
                }
            }
        }

        return result;
    }

    private extractTextFromNode(node: any): string {
        if (node instanceof Y.XmlText) {
            return node.toString();
        }
        if (node instanceof Y.XmlElement) {
            const children = node.toArray();
            const texts = children.map((child: any) => this.extractTextFromNode(child)).filter(Boolean);
            return texts.join('');
        }
        return '';
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
        if (!this._children) {
            const yArray = this.yMap.get("children") as Y.Array<string>;
            this._children = new ReactiveYArrayProxy<Task>(yArray, (taskId) => this.store.getTask(taskId));
        }
        return this._children;
    }

    get parents(): ReactiveYArrayProxy<Task> {
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

    insertChild(index?: number, text: string = "") {
        const child = this.store.createTask(text);
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
            status: this.status,
            children: this.children.toIds(),
            parents: this.parents.toIds(),
            events: this.events.toIds(),
        };
    }
}
