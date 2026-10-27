import * as Y from "yjs";
import { Database } from "$lib/states/meta/database.svelte";

export let db: Database;

export function load(doc: Y.Doc) {
    db = new Database(doc);
}
