import type { RxCollection, RxCollectionCreator, RxDocument } from "rxdb";
import { type Journal, JournalSchema } from "./rxdb.schema";
import type { Database } from "./rxdb";
import { id } from "./utils";
import type { TaskProxy } from "./task";

function methods(db: Database) {
    // async function getOrCreateJounral(
    //     this: RxDocument<Journal>,
    //     seq: number,
    //     text: string = "",
    //     note: string = "",
    // ) {
    // }

    return {
        // getOrCreateJounral,
    };
}

function staticMethods(db: Database) {
    // function findById(
    //     this: JournalCollection,
    //     id: string,
    // ) {
    //     return this.findOne().where({ id });
    // }

    async function createJournalTask(
        this: JournalCollection,
        time: number,
        type: string,
        text?: string,
        note?: string,
    ) {
        const { textId, noteId } = db.newTextAndNote(text, note);
        const taskId = id();
        const journalId = id();
        const [task, journal] = await Promise.all([
            db.tasks.insert({
                id: taskId,
                textId,
                noteId,
                isCompleted: false,
                children: [],
            }),
            this.insert({
                id: journalId,
                time,
                type,
                task: taskId,
            }),
        ]);

        return { task, time, id: journalId };
    }

    async function getOrCreateJounral(
        this: JournalCollection,
        time: number,
        type: string,
        defaultText?: string,
        defaultNote?: string,
    ) {
        let journal = await this.findOne().where({ time, type }).exec();
        if (!journal) {
            return this.createJournalTask(time, type, defaultText, defaultNote);
        }
        const task = await journal.populate("task") as TaskProxy;
        return {
            task,
            time,
            id: journal.id,
        };
    }
    return {
        // findById,
        createJournalTask,
        getOrCreateJounral,
    };
}

type Methods = ReturnType<typeof methods>;
type CollectionMethods = ReturnType<typeof staticMethods>;

export type JournalProxy = RxDocument<Journal, Methods>;
export type JournalCollection = RxCollection<
    Journal,
    Methods,
    CollectionMethods
>;

export function journalCollectionCreator(
    db: Database,
): RxCollectionCreator<Journal> {
    return {
        schema: JournalSchema,
        methods: methods(db),
        statics: staticMethods(db),
    };
}
