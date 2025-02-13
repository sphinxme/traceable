import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

import { addRxPlugin, createRxDatabase, type RxDatabase } from "rxdb";
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup'
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { getFetchWithCouchDBAuthorization, replicateCouchDB } from 'rxdb/plugins/replication-couchdb';
import { fetch as tauri_fetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@tauri-apps/api/core'

import { id } from "./utils.svelte";
import {
    type TaskCollection,
    taskCollectionCreator,
    type TaskProxy,
} from "./task.svelte";
import { type EventCollection, eventCollectionCreator } from "./event";
import { type JournalCollection, journalCollectionCreator } from "./journal";
import { type UserCollection, userCollectionCreator } from "./user";
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBCleanupPlugin);

export type StateMap = Y.Map<boolean | StateMap>

const PUBLIC_COUCHDB_ENDPOINT = import.meta.env.VITE_COUCHDB_ENDPOINT;
const PUBLIC_COUCHDB_USER = import.meta.env.VITE_COUCHDB_USER;
const PUBLIC_COUCHDB_PASSWORD = import.meta.env.VITE_COUCHDB_PASSWORD;
export class Database {
    doc: Y.Doc;
    texts!: Y.Map<Y.Text>; // id-Y.Text
    notes!: Y.Map<Y.Text>;
    panelStates!: Y.Map<StateMap>; // panel_id-Y.Text

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
            const client = createClient({ authEndpoint: import.meta.env.VITE_LIVEBLOCKS_AUTH_ENDPOINT });
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
        let adapted_fetch = fetch;
        if (isTauri()) {
            adapted_fetch = tauri_fetch;
        }

        const authed_fetch: typeof fetch = (input, init) => {
            // 构建 Basic Auth 字符串
            const basicAuth = `Basic ${btoa(`${PUBLIC_COUCHDB_USER}:${PUBLIC_COUCHDB_PASSWORD}`)}`;

            // 合并原有的headers和新的Authorization header
            const headers = new Headers(init?.headers || {});
            headers.set('Authorization', basicAuth);

            // 创建新的init对象,包含更新后的headers
            const newInit: RequestInit = {
                ...(init || {}),
                headers
            };

            // 调用原始fetch并返回结果
            return adapted_fetch(input, newInit);
        }

        const replicationEventState = replicateCouchDB({
            replicationIdentifier: 'events',
            collection: this.events,
            url: `${PUBLIC_COUCHDB_ENDPOINT}/events/`,
            fetch: authed_fetch,
            pull: {},
            push: {},
        })

        const replicationJournalState = replicateCouchDB({
            replicationIdentifier: 'journal',
            collection: collection.journals,
            url: `${PUBLIC_COUCHDB_ENDPOINT}/journals/`,
            fetch: authed_fetch,
            pull: {},
            push: {}
        })

        const replicationUserState = replicateCouchDB({
            replicationIdentifier: 'users',
            collection: collection.users,
            url: `${PUBLIC_COUCHDB_ENDPOINT}/users/`,
            fetch: authed_fetch,
            pull: {},
            push: {}
        })

        const replicationTaskState = replicateCouchDB({
            replicationIdentifier: 'tasks',
            collection: this.rxdb.collections.tasks,
            url: `${PUBLIC_COUCHDB_ENDPOINT}/tasks/`,
            fetch: authed_fetch,
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
        ]).catch((e) => { console.error(e) })

        this.texts = this.doc.getMap("texts");
        this.notes = this.doc.getMap("notes");
        this.panelStates = this.doc.getMap("panelStates");

        this.rootTask = await this.getAndInitRootId();
    }

    async getUserId() {
        let user = await this.users.findOne().exec();
        return user?.id!;
    }

    async getAndInitRootId() {
        if (this.rootTask) {
            return this.rootTask
        }

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

    /**
     * 将整个数据导出为JSON格式以便备份或再次导入
     */
    public async export() {
        return {
            tasks: await this.tasks.exportJSON(),
            events: await this.events.exportJSON(),
            journals: await this.journals.exportJSON(),
            users: await this.users.exportJSON(),
            texts: this.texts.toJSON() as Record<string, string>, // id->Y.Text
            notes: this.notes.toJSON() as Record<string, string>,  // id->Y.Text
        };
    }

    public async clear() {
        Promise.all([
            this.tasks.find({}).remove(),
            this.events.find({}).remove(),
            this.journals.find({}).remove(),
            this.users.find({}).remove()
        ])
        Promise.all([
            this.tasks.cleanup(),
            this.events.cleanup(),
            this.journals.cleanup(),
            this.users.cleanup()
        ]);
        this.texts.clear();
        this.notes.clear();
        this.panelStates.clear();
        this.rootTask = undefined as unknown as TaskProxy;
    }

    public async import(data: Awaited<ReturnType<this['export']>>) {
        await this.clear();
        this.doc.transact(() => {
            Object.entries(data.texts).forEach(([id, text]) => {
                this.texts.set(id, new Y.Text(text))
            })
            Object.entries(data.notes).forEach(([id, note]) => {
                this.notes.set(id, new Y.Text(note))
            })
        })

        function deleteMetaFields(docs: any[]) {
            return docs.map(({ _deleted, _meta, ...rest }) => rest)
        }

        await this.tasks.bulkInsert(deleteMetaFields(data.tasks.docs))
        await this.events.bulkInsert(deleteMetaFields(data.events.docs))
        await this.journals.bulkInsert(deleteMetaFields(data.journals.docs))
        await this.users.bulkInsert(deleteMetaFields(data.users.docs))

        await this.tasks.cleanup();
        await this.events.cleanup();
        await this.journals.cleanup();
        await this.users.cleanup();

    }
}

export const db = new Database();
