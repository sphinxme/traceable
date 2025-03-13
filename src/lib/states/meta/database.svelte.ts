import * as Y from "yjs";
import { Repository } from "../yjs/repository";
import { TaskProxyManager } from "./task.svelte";
import { EventProxyManager } from "./event.svelte";
import { JournalProxyManager, type JournalType } from "./journal.svelte";
import { UserManager } from "./user.svelte";

export class Database {
    readonly doc: Y.Doc;
    readonly repository: Repository;
    readonly taskProxyManaager: TaskProxyManager;
    readonly eventProxyManager: EventProxyManager;
    readonly journalProxyManager: JournalProxyManager;
    readonly userManager: UserManager;

    public constructor(doc: Y.Doc) {
        this.doc = doc;
        this.repository = new Repository(doc);

        this.taskProxyManaager = new TaskProxyManager(this.repository, this.repository);
        this.eventProxyManager = new EventProxyManager(this.repository.events, this.repository, this.repository, this.taskProxyManaager);
        this.taskProxyManaager.eventproxyManager = this.eventProxyManager;
        this.journalProxyManager = new JournalProxyManager(this.repository.journals, this.taskProxyManaager);
        this.userManager = new UserManager(this.repository.user, this.taskProxyManaager);
    }

    public clear() {
        this.doc.transact(() => {
            const repository = this.repository;
            repository.tasks.clear();
            repository.texts.clear();
            repository.journals.clear();
            repository.events.clear();
            repository.panelStates.clear();
            repository.user.clear();
        });
    }

    public import(data: ReturnType<typeof Database.prototype.export>) {
        this.clear();

        this.doc.transact(() => {
            const repository = this.repository;
            Object.entries(data.tasks).forEach(([id, task]) => {
                const { children, parents, events, ...others } = task;
                repository.tasks.set(id, new Y.Map(Object.entries({
                    ...others,
                    children: Y.Array.from(children),
                    parents: Y.Array.from(parents),
                    events: Y.Array.from(events),
                })));
            });
            Object.entries(data.texts).forEach(([id, text]) => {
                repository.texts.set(id, new Y.Text(text));
            });
            Object.entries(data.events).forEach(([id, event]) => {
                repository.events.set(id, new Y.Map(Object.entries(event)));
            });
            Object.entries(data.journals).forEach(([id, journal]) => {
                repository.journals.set(id, new Y.Map(Object.entries(journal)));
            });
            repository.user.set("user", data.user);
        });
    }

    public export() {
        const tasks = this.repository.tasks.toJSON() as Record<string, {
            id: string;
            textId: string;
            noteId: string;
            children: string[];
            parents: string[];
            events: string[];
            status: "DONE" | "TODO" | "BLOCKED";
        }>;
        const texts = this.repository.texts.toJSON() as Record<string, string>;
        const events = this.repository.events.toJSON() as Record<string, {
            id: string;
            textId: string;
            taskId: string;
            start: number;
            end: number;
        }>;
        const journals = this.repository.journals.toJSON() as Record<string, {
            id: string;
            type: JournalType;
            taskId: string;
            time: string;
        }>;
        const user = this.repository.user.toJSON() as {
            rootTaskId: string;
        }

        return {
            tasks,
            texts,
            events,
            journals,
            user,
        }
    }


}