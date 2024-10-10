import { Database, db } from "./rxdb";
import { id } from "./utils";
import type { TaskProxy } from "./task";
import type { JournalProxy } from "./journal";
import type { EventProxy } from "./event";
import type { UserProxy } from "./user";
import type { Event, Journal, Task, User } from "./rxdb.schema";

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
