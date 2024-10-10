import type { RxCollection, RxCollectionCreator, RxDocument } from "rxdb";
import { type User, UserSchema } from "./rxdb.schema";
import type { Database } from "./rxdb";

export type UserProxy = RxDocument<User>;
export type UserCollection = RxCollection<User>;

export function userCollectionCreator(
    db: Database,
): RxCollectionCreator<User> {
    return {
        schema: UserSchema,
        // methods:
    };
}
