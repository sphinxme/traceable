import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

import { addRxPlugin, createRxDatabase, type RxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { getFetchWithCouchDBAuthorization, replicateCouchDB } from 'rxdb/plugins/replication-couchdb';
import { fetch } from '@tauri-apps/plugin-http';

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

        const authed_fetch1 = getFetchWithCouchDBAuthorization("sphinx", "0626");
        let authed_fetch2: typeof fetch = (input, init) => {
            // 构建 Basic Auth 字符串
            const basicAuth = `Basic ${btoa(`sphinx:0626`)}`;

            // 合并原有的headers和新的Authorization header
            const headers = new Headers(init?.headers || {});
            headers.set('Authorization', basicAuth);

            // 创建新的init对象,包含更新后的headers
            const newInit: RequestInit = {
                ...(init || {}),
                headers
            };

            // 调用原始fetch并返回结果
            return fetch(input, newInit);
        }


        if (!('__TAURI_INTERNALS__' in window)) {
            authed_fetch2 = authed_fetch1
        }


        const replicationEventState = replicateCouchDB({
            replicationIdentifier: 'events',
            collection: this.events,
            url: "http://124.221.36.39:5984/events/",
            fetch: authed_fetch2,
            pull: {},
            push: {},
        })

        const replicationJournalState = replicateCouchDB({
            replicationIdentifier: 'journal',
            collection: collection.journals,
            url: "http://124.221.36.39:5984/journals/",
            fetch: authed_fetch2,
            pull: {},
            push: {}
        })

        const replicationUserState = replicateCouchDB({
            replicationIdentifier: 'users',
            collection: collection.users,
            url: "http://124.221.36.39:5984/users/",
            fetch: authed_fetch2,
            pull: {},
            push: {}
        })

        const replicationTaskState = replicateCouchDB({
            replicationIdentifier: 'tasks',
            collection: this.rxdb.collections.tasks,
            url: "http://124.221.36.39:5984/tasks/",
            fetch: authed_fetch2,
            pull: {},
            push: {}
        })

        const log = (msg: string) => {
            return () => {
                console.log(msg);
            }
        }

        await Promise.all([
            this.loadFromIndexedDB().then(log("indexedDB loaded")),
            this.loadFromLiveBlocks().then(log("loaded from live blocks")),
            replicationEventState.awaitInitialReplication().then(log("loaded event state")),
            replicationJournalState.awaitInitialReplication().then(log("loaded journal state")),
            replicationTaskState.awaitInitialReplication().then(log("loaded task state")),
            replicationUserState.awaitInitialReplication().then(log("loaded user state")),
        ])

        this.texts = this.doc.getMap("texts");
        this.notes = this.doc.getMap("notes");

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
            await parent.patch({ children }); // FIXME:优化
        } else {
            // 2. 如果是只挂在这个父亲上(也可能父亲已经被上层函数删掉了 length为0) 就删掉本体的所有内容

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
            const textId = task.textId;
            const noteId = task.noteId;
            const removeTaskPromise = task.remove();

            // 2.3. 删除task关联的event
            const removeEventsPromise = this.events.find().where({ task: id })
                .remove();

            // 2.4. 删除task本身的note和text
            this.texts.delete(textId);
            this.notes.delete(noteId);
            await removeTaskPromise

            // 2.5. 递归删除task的所有一层孩子task
            const recurivelyRemoveTaskPromises = task.children.map((child) => {
                return this.deleteTask(child, id);
            });

            await Promise.all([
                removeEventsPromise,
                ...removeParentPromises,
                ...recurivelyRemoveTaskPromises,
            ]);
        }
    }
}

export const db = new Database();
