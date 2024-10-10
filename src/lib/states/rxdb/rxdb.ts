import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

import { addRxPlugin, createRxDatabase, type RxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";

import { id } from "./utils";
import {
    type TaskCollection,
    taskCollectionCreator,
    type TaskProxy,
} from "./task";
import { type EventCollection, eventCollectionCreator } from "./event";
import { type JournalCollection, journalCollectionCreator } from "./journal";
import { type UserCollection, userCollectionCreator } from "./user";
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBDevModePlugin);

export class Database {
    doc: Y.Doc;
    texts!: Y.Map<Y.Text>; // id-Y.Text
    notes!: Y.Map<Y.Text>;

    rxdb!: RxDatabase;
    tasks!: TaskCollection;
    events!: EventCollection;
    journals!: JournalCollection;
    users!: UserCollection;

    rootTask!: TaskProxy;

    loading: boolean = false;

    constructor() {
        this.doc = new Y.Doc();
    }

    private loadFromIndexedDB() {
        return new Promise<void>((resolve, reject) => {
            const p = new IndexeddbPersistence("traceable-yjs", this.doc);
            p.once("synced", resolve);
        });
    }

    private loadFromLiveBlocks() {
        return new Promise<void>((resolve, reject) => {
            const client = createClient({
                publicApiKey:
                    "pk_dev_tYlV-ZsJQIn7IOFaQXzXNmPF7qdHA-AHElTnBv1eVTNZwSEvNsABx3WQIVNJp9ad",
            });
            const { room, leave } = client.enterRoom("traceable-yjs"); // leave
            window.addEventListener("beforeunload", leave);
            const p = new LiveblocksYjsProvider(room, this.doc);
            p.once("synced", resolve);
        });
    }

    async load() {
        await Promise.all([
            this.loadFromIndexedDB(),
            this.loadFromLiveBlocks(),
        ]);

        this.texts = this.doc.getMap("texts");
        this.notes = this.doc.getMap("notes");

        this.rxdb = await createRxDatabase({
            name: "traceable",
            storage: getRxStorageDexie(),
        });

        const collection = await this.rxdb.addCollections({
            tasks: taskCollectionCreator(db),
            events: eventCollectionCreator(db),
            journals: journalCollectionCreator(db),
            users: userCollectionCreator(db),
        });

        this.tasks = collection.tasks as TaskCollection;
        this.events = collection.events as EventCollection;
        this.journals = collection.journals as JournalCollection;
        this.users = collection.users as UserCollection;

        this.rootTask = await this.getRootId();
    }

    async getRootId() {
        let user = await this.users.findOne().exec();
        if (!user) {
            this.rootTask = await this.tasks.insert({
                id: id(),
                ...this.newTextAndNote(),
                isCompleted: false,
                children: [],
            });
            user = await this.users.insert({
                id: "root",
                rootTask: this.rootTask.id,
            });
        } else {
            this.rootTask = await user.populate("rootTask");
        }

        return this.rootTask;
    }

    newTextAndNote(text?: string, note?: string) {
        const textId = id();
        const noteId = id();
        this.doc.transact(() => {
            this.texts.set(textId, new Y.Text(text));
            this.notes.set(noteId, new Y.Text(note));
        });
        return { textId, noteId };
    }

    /**
     * 从指定树的位置删除这个task, 并递归删除它下面的子task
     * - 如果这个task只挂在这个树上, 那就把整体都删掉
     * - 如果这个task不仅挂在这个树上, 还在别的地方存在, 那就只删除它跟父节点的关系, 本体仍保留着
     * @param id
     * @param parentId
     */
    public async deleteTask(id: string, parentId?: string) {
        const parents = await this.tasks.find().where({
            children: {
                "$elemMatch": {
                    "$eq": id,
                },
            },
        }).exec();

        if (parents.length > 1 && parentId) {
            // 1. 如果还挂在别的地方并且指定了边, 就只把边删掉
            const parent = parents.find((parent) => parent.id === parentId);
            if (!parent) {
                throw Error(`invalid parentId: ${parentId}`);
            }
            let children = [...parent.children];
            const index = children.findIndex((child) => child === id);
            children.splice(index, 1);
            // await parent.modify((data) => {
            //     const index = data.children.findIndex((child) => child === id);
            //     data.children.splice(index);
            //     return data;
            // });
            await parent.patch({ children }); // FIXME:优化
        } else {
            // 2. 如果是只挂在这个父亲上 就删掉本体的所有内容

            // 2.1. 把task从特定parentId的边删除(没指定parentId就是默认全删除)
            const removeParentPromises = parents.map((parent) => {
                // TODO:看看能不能用$pull优化掉
                let children = [...parent.children];
                const index = children.findIndex((child) => child === id);
                children.splice(index, 1);
                return parent.patch({ children });
                // return parent.modify((data) => {
                //     const index = data.children.findIndex((child) =>
                //         child === id
                //     );
                //     data.children.splice(index);
                //     return data;
                // });
            });

            // 2.2. 删除task本身
            const task = await this.tasks.findOne().where({ id }).exec();
            if (!task) {
                throw new Error(`invalid taskId: ${id}`);
            }
            const removeTaskPromise = task.remove();

            // 2.3. 删除task关联的event
            const removeEventsPromise = this.events.find().where({ task: id })
                .remove();

            // 2.4. 删除task本身的note和text
            this.texts.delete(task.textId);
            this.notes.delete(task.noteId);

            // 2.5. 递归删除task的所有一层孩子task
            const recurivelyRemoveTaskPromises = task.children.map((child) => {
                return this.deleteTask(child, id);
            });

            await Promise.all([
                ...removeParentPromises,
                removeTaskPromise,
                removeEventsPromise,
                ...recurivelyRemoveTaskPromises,
            ]);
        }
    }
}

export const db = new Database();
