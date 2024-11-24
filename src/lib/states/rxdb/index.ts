import { Database, db } from "./rxdb.ts";
import { id } from "./utils.svelte.js";
import type { TaskProxy } from "./task.svelte.js";
import type { JournalProxy } from "./journal.ts";
import type { EventProxy } from "./event.ts";
import type { UserProxy } from "./user.ts";
import type { Event, Journal, Task, User } from "./rxdb.schema.ts";

export { Database, db, id };
export type {
    Event,
    EventProxy,
    Journal,
    JournalProxy,
    Task,
    TaskProxy,
    User,
    UserProxy,
};
