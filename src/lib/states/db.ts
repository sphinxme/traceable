import schema, { INSTANT_APP_ID } from "./instant.schema";
import * as Y from "yjs";
import { id, init, init_experimental } from "svelte-instantdb";
import { IndexeddbPersistence } from "y-indexeddb";
import { writable } from "svelte/store";
import { onDestroy } from "svelte";

type InstantDB = ReturnType<typeof init_experimental<typeof schema>>;

const appID = INSTANT_APP_ID;

export class Database {
    instant: InstantDB;

    doc: Y.Doc;
    texts: Y.Map<Y.Text>; // id-Y.Text
    notes: Y.Map<Y.Text>;

    loading: boolean = false;
    provider?: IndexeddbPersistence;

    constructor(appId: string, apiURI?: string, websocketURI?: string) {
        this.instant = init_experimental({
            appId: appId,
            // apiURI: apiURI,
            // websocketURI: websocketURI,
            schema,
        });

        this.doc = new Y.Doc();
        this.texts = this.doc.getMap("texts");
        this.notes = this.doc.getMap("notes");
    }

    async load() {
        return new Promise<void>((resolve, reject) => {
            this.provider = new IndexeddbPersistence("traceable", this.doc);
            this.provider.on("synced", () => {
                console.log("content from the yjs is loaded");
                this.texts = this.doc.getMap("texts");
                this.notes = this.doc.getMap("notes");
                resolve();
            });
        });
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
    public deleteTask(id: string, parentId?: string) {
        return new Promise<void>((resolve, reject) => {
            let got = false;
            let unsubscribe: () => void;
            unsubscribe = this.instant._core.subscribeQuery({
                tasks: {
                    $: { where: { id } },
                    parentList: {
                        parent: {},
                        /*$: { where: { "parent.id": parentId } } */
                    },
                    childList: { task: {} },
                    events: {},
                },
            }, (resp) => {
                if (got) {
                    new Promise<void>((resolve) => {
                        if (unsubscribe) {
                            unsubscribe();
                        }
                        resolve();
                    });
                    return;
                }
                got = true;
                if (resp.error) {
                    console.log({ id, parentId });
                    reject(resp.error.message);
                    throw new Error(resp.error.message);
                }

                const task = resp.data.tasks[0];

                if (task.parentList.length > 1 && parentId) {
                    // 1. 如果还挂在别的地方并且指定了边, 就只把边删掉
                    const edgeId = task.parentList.find(({ parent }) =>
                        parent?.id === parentId
                    )?.id;
                    if (!edgeId) {
                        return;
                    }
                    this.instant.transact([
                        this.instant.tx.taskChildEdges[edgeId].delete(),
                    ]);
                } else {
                    // 2. 如果是只挂在这个父亲上 就删掉本体的所有内容

                    this.instant.transact([
                        // 1. 把task从特定parentId的边删除(没指定parentId就是默认全删除)
                        ...task.parentList.map((edge) =>
                            this.instant.tx.taskChildEdges[edge.id].delete()
                        ),
                        // 2. 删除task本身
                        this.instant.tx.tasks[id].delete(),

                        // 3. 删除task关联的event
                        ...task.events.map((e) =>
                            this.instant.tx.events[e.id].delete()
                        ),
                    ]);
                    // 4. 删除task本身的note和text
                    this.doc.transact(() => {
                        this.texts.delete(task.textId);
                        this.notes.delete(task.noteId);
                    });

                    // 5. 递归删除task的所有一层孩子task
                    task.childList.forEach((edge) => {
                        if (!edge.task) {
                            return;
                        }
                        this.deleteTask(edge.task.id, id);
                    });
                }
                resolve();
            });
        });
    }

    public createTask(parentTaskId: string, seq: number, text?: string) {
        const newTaskId = id();
        const { textId, noteId } = db.newTextAndNote();
        db.instant.transact([
            db.instant.tx.tasks[newTaskId].update({
                textId,
                noteId,
                isCompleted: false,
            }),
            db.instant.tx.taskChildEdges[id()]
                .update({ seq: seq })
                .link({ parent: parentTaskId, task: newTaskId }),
        ]);
    }

    public getNoteText(id: string) {
        const note = this.notes.get(id);
        if (!note) {
            throw new Error(`unknown noteId: ${id}`);
        }
        const { subscribe, set } = writable(note.toJSON());
        const listener = () => {
            set(note.toJSON());
        };

        note.observe(listener);
        onDestroy(() => {
            note.unobserve(listener);
        });
        return subscribe;
    }

    public getTask(id: string) {
        interface TaskData {
            id: string;
            isCompleted: boolean;
            noteId: string;
            textId: string;
        }

        return new Promise<TaskData>((resolve, reject) => {
            let got = false;
            let unsubscribe: () => void;
            unsubscribe = this.instant._core.subscribeQuery({
                tasks: { $: { where: { id } } },
            }, (resp) => {
                if (got) {
                    new Promise<void>((resolve) => {
                        if (unsubscribe) {
                            unsubscribe();
                        }
                        resolve();
                    });
                    return;
                }
                got = true;
                if (resp.error) {
                    reject(resp.error);
                    return;
                }
                if (resp.data.tasks.length < 1) {
                    throw new Error(`invalid taskId:${id}`);
                }
                resolve(resp.data.tasks[0]);
            });
        });
    }

    public getTaskChildren(id: string) {
        interface ReturnItemType {
            seq: number;
            task?: {
                id: string;
                isCompleted: boolean;
                noteId: string;
                textId: string;
            };
        }
        return new Promise<ReturnItemType[]>((resolve, reject) => {
            let got = false;
            let unsubscribe: () => void;
            unsubscribe = this.instant._core.subscribeQuery(
                {
                    taskChildEdges: {
                        $: { where: { "parent.id": id } },
                        task: {},
                    },
                },
                (resp) => {
                    if (got) {
                        new Promise<void>((resolve) => {
                            if (unsubscribe) {
                                unsubscribe();
                            }
                            resolve();
                        });
                        return;
                    }
                    got = true;
                    if (resp.error) {
                        reject(resp.error);
                        return;
                    }
                    resolve(resp.data.taskChildEdges);
                },
            );
        });
    }

    public async moveTask(
        draggingTaskId: string,
        originParentTaskId: string,
        parentTaskId: string,
        index: number,
    ) {
        console.log({ index });
        if (index < 0) {
            throw new Error(`invalid index:${index}`);
        }

        // 1.删除原来的边(只删边)
        // 2.加新的边
        const oldEdges = await this.queryEdges({
            and: [
                { "parent.id": originParentTaskId },
                { "task.id": draggingTaskId },
            ],
        });

        const parentChildren = (await this.getTaskChildren(parentTaskId))
            .sort((a, b) => a.seq - b.seq);

        // 3种情况:顺序不能更换
        // 1. 尾插(index >= children.length), seq取当前时间戳
        // 2. 头插(index==0): seq取 (第0个seq+0) / 2; 因为不是1, 所以第0个一定存在
        // 3. 中间(剩余情况):seq取 (第index-1的seq + index个的seq) / 2
        let seq = 0;
        if (index >= parentChildren.length) {
            seq = Date.now().valueOf();
        } else if (index === 0) {
            seq = (0 + parentChildren[0].seq) / 2;
        } else {
            seq = (parentChildren[index - 1].seq + parentChildren[index].seq) /
                2;
        }

        this.instant.transact([
            ...oldEdges.map(({ id }) =>
                this.instant.tx.taskChildEdges[id].delete()
            ),

            this.instant.tx.taskChildEdges[id()].update({ seq }).link({
                parent: parentTaskId,
                task: draggingTaskId,
            }),
        ]);
    }

    public async copyTask(
        draggingTaskId: string,
        parentTaskId: string,
        index: number,
    ) {
        // 只加新的边
        const parentChildren = await this.getTaskChildren(parentTaskId);

        // 3种情况:顺序不能更换
        // 1. 尾插(index >= children.length), seq取当前时间戳
        // 2. 头插(index==0): seq取 (第0个seq+0) / 2; 因为不是1, 所以第0个一定存在
        // 3. 中间(剩余情况):seq取 (第index-1的seq + index个的seq) / 2
        let seq = 0;
        if (index >= parentChildren.length) {
            seq = Date.now().valueOf();
        } else if (index === 0) {
            seq = (0 + parentChildren[0].seq) / 2;
        } else {
            seq = (parentChildren[index - 1].seq + parentChildren[index].seq) /
                2;
        }

        this.instant.transact([
            this.instant.tx.taskChildEdges[id()].update({ seq }).link({
                parent: parentTaskId,
                task: draggingTaskId,
            }),
        ]);
    }

    private queryEdges(where: any) {
        interface Edge {
            seq: number;
            id: string;
        }
        return new Promise<Edge[]>((resolve, reject) => {
            let got = false;
            let unsubscribe: (() => void) | undefined;
            unsubscribe = this.instant._core.subscribeQuery(
                {
                    taskChildEdges: { $: { where } },
                },
                (resp) => {
                    if (got) {
                        new Promise<void>((resolve) => {
                            if (unsubscribe) {
                                unsubscribe();
                            }
                            resolve();
                        });
                        return;
                    }
                    got = true;

                    if (resp.error) {
                        reject(resp.error);
                        return;
                    }
                    console.log(resp.data);
                    resp.data.taskChildEdges[0].id;
                    resp.data.taskChildEdges[0].seq;
                    resolve(resp.data.taskChildEdges);
                },
            );
        });
    }

    public async createJournalTask(
        preId: string | undefined,
        time: number,
        type: string,
        text: string,
    ) {
        const { textId, noteId } = this.newTextAndNote(text);
        const taskId = id();
        const journalId = id();
        await this.instant.transact([
            this.instant.tx.tasks[taskId].update({
                isCompleted: false,
                noteId,
                textId,
            }),
            this.instant.tx
                .journalTasks[journalId]
                .update({ time, type })
                .link({ prev: preId, task: taskId }),
        ]);

        return { taskId, time, textId, id: journalId };
    }
}

export const db = new Database(appID);
export { id };
export const rootId = "edd0c61a-751c-40c1-be8d-5ce3b4d668f5";
