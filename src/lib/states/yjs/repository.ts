import * as Y from "yjs";
import { id } from "../meta/utils";


export class Repository {
    public readonly tasks: Y.Map<any>;
    public readonly texts: Y.Map<any>;
    public readonly journals: Y.Map<any>;
    public readonly events: Y.Map<any>;
    public readonly panelStates: Y.Map<any>;
    public readonly user: Y.Map<any>;

    constructor(private readonly doc: Y.Doc) {
        this.tasks = this.doc.getMap("tasks");
        this.texts = this.doc.getMap("texts");
        this.journals = this.doc.getMap("journals");
        this.events = this.doc.getMap("events");
        this.panelStates = this.doc.getMap("panelStates");
        this.user = this.doc.getMap("user");
    }

    getYTask(id: string): Y.Map<any> {
        if (!this.tasks.has(id)) {
            throw new Error(`task not found: ${id}`);
        }
        return this.tasks.get(id);
    }
    newYTask(textId: string, noteId: string): string {
        const taskId = id()
        const task = new Y.Map()
        task.set("id", taskId);
        task.set("textId", textId);
        task.set("noteId", noteId);
        task.set("children", new Y.Array());
        task.set("parents", new Y.Array());
        task.set("events", new Y.Array());
        task.set("status", "TODO");
        this.tasks.set(taskId, task);
        return taskId;
    }
    deleteYTask(id: string): void {
        this.tasks.delete(id);
    }

    getYText(textId: string): Y.Text {

        if (!this.texts.has(textId)) {
            throw new Error(`text not found: ${textId}`);
        }
        return this.texts.get(textId);
    }
    newYText(text?: string): string {  // 返回id
        const textId = id()
        const yText = new Y.Text(text);
        this.texts.set(textId, yText);
        return textId;

    }
    deleteYText(textId: string): void {
        this.texts.delete(textId);
    }


    getYEvent(id: string): Y.Map<any> {
        if (!this.events.has(id)) {
            throw new Error(`event not found: ${id}`);
        }
        return this.events.get(id);

    }
    newYEvent(taskId: string, textId: string, start: number, end: number): string { // 返回id
        const eventId = id()
        const event = new Y.Map()
        event.set("id", eventId);
        event.set("taskId", taskId);
        event.set("textId", textId);
        event.set("start", start);
        event.set("end", end);
        this.events.set(eventId, event);
        return eventId;
    }
    deleteYEvent(id: string): void {
        this.events.delete(id);
    }

}