import {
    type RxCollection,
    type RxCollectionCreator,
    type RxDocument,
} from "rxdb";
import { type Task, TaskSchema } from "./rxdb.schema";
import type { Database } from "./rxdb";
import { id, yStore } from "./utils.svelte";

function getTaskMethods(db: Database) {
    async function addChild(
        this: RxDocument<Task>,
        seq: number = Number.MAX_SAFE_INTEGER,
        text: string = "",
        note: string = "",
    ) {
        const newTaskId = id();
        let children = [...this.children];
        children.splice(seq, 0, newTaskId);
        await Promise.all([
            db.tasks.insert({
                id: newTaskId,
                ...db.newTextAndNote(text, note),
                isCompleted: false,
                children: [],
            }),
            this.patch({
                children, // FIXME:怎么改一下
            }),
            // this.modify((data) => {
            //     // data.children.
            //     // data.children = [];
            //     // data.children.splice(seq, 0, newTaskId);
            //     // data.children.push(newTaskId);
            //     data.children[0] = newTaskId;
            //     return data;
            // }),
        ]);
    }

    function moveInto(this: RxDocument<Task>, seq: number, childId: string) {
        let children = [...this.children];
        children.splice(seq, 0, childId);
        return this.patch({ children });
    }

    /**
     * 仅移除边 不真正删除
     * @param this
     * @param childId
     * @returns
     */
    function removeChild(this: RxDocument<Task>, childId: string) {
        console.log("removeChild", this.id, this.children, childId);
        let children = [...this.children];
        children.splice(children.findIndex((id) => id === childId), 1); // FIXME:优化
        return this.patch({ children });
        // return this.modify((t) => {
        //     t.children.splice(t.children.findIndex((id) => id === childId), 0);
        //     return t;
        // });
    }

    function spliceChildren(
        this: RxDocument<Task>,
        start: number,
        deleteCount: number,
        ...child: string[]
    ) {
        let children = [...this.children];
        children.splice(start, deleteCount, ...child);
        return this.patch({ children }); // FIXME:优化
        // return this.modify((t) => {
        //     t.children.splice(start, deleteCount, ...child);
        //     return t;
        // });
    }

    async function getChildren(this: RxDocument<Task>) {
        return (await this.populate("children")) as RxDocument<Task>[];
    }

    function text(this: RxDocument<Task>) {
        return yStore(db.texts.get(this.textId))
    }

    function yText(this: RxDocument<Task>) {
        return db.texts.get(this.textId);
    }

    function yNote(this: RxDocument<Task>) {
        return db.notes.get(this.noteId);
    }

    function note(this: RxDocument<Task>) {
        return yStore(db.notes.get(this.noteId))
    }

    return {
        addChild,
        moveInto,
        removeChild,
        spliceChildren,
        getChildren,
        text,
        note,
        yNote,
        yText,
    };
}

function getTaskStaticMethods(db: Database) {
    function findById(this: RxCollection<Task, TaskMethods>, id: string) {
        return this.findOne().where({ id });
    }

    // async function createJournalTask(
    //     this: RxCollection<Task, TaskMethods>,
    //     time: number,
    //     type: string,
    //     text?: string,
    //     note?: string,
    // ) {
    //     const { textId, noteId } = db.newTextAndNote(text, note);
    //     const taskId = id();
    //     const journalId = id();
    //     await Promise.all([
    //         this.insert({
    //             id: taskId,
    //             textId,
    //             noteId,
    //             isCompleted: false,
    //             children: [],
    //         }),
    //         db.journals.insert({
    //             id: journalId,
    //             time,
    //             type,
    //             task: taskId,
    //         }),
    //     ]);

    //     return { taskId, time, textId, id: journalId };
    // }
    return {
        findById,
        // createJournalTask,
    };
}

type TaskMethods = ReturnType<typeof getTaskMethods>;
type TaskCollectionMethods = ReturnType<typeof getTaskStaticMethods>;
export type TaskProxy = RxDocument<Task, TaskMethods>;
export type TaskCollection = RxCollection<
    Task,
    TaskMethods,
    TaskCollectionMethods
>;

export function taskCollectionCreator(db: Database): RxCollectionCreator<Task> {
    return {
        schema: TaskSchema,
        methods: getTaskMethods(db),
        statics: getTaskStaticMethods(db),
    };
}
