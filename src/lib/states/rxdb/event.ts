import type { RxCollection, RxCollectionCreator, RxDocument } from "rxdb";
import { type Event, EventSchema } from "./rxdb.schema";
import type { Database } from "./rxdb";

export type EventProxy = RxDocument<Event>;
export type EventCollection = RxCollection<Event>;

export function eventCollectionCreator(
    db: Database,
): RxCollectionCreator<Event> {
    return {
        schema: EventSchema,
        // methods:
    };
}
