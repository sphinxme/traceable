import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

export function newYDoc() {
    return new Y.Doc();
}

export function loadFromIndexedDB(doc: Y.Doc) {
    return new Promise<void>((resolve, reject) => {
        const p = new IndexeddbPersistence("traceable-yjs", doc);
        p.once("synced", () => {
            console.log("loaded from indexedDB")
            resolve()
        });
    });
}

export function loadFromLiveBlocks(doc: Y.Doc) {
    return new Promise<void>((resolve, reject) => {
        const client = createClient({ authEndpoint: import.meta.env.VITE_LIVEBLOCKS_AUTH_ENDPOINT });
        const { room, leave } = client.enterRoom("traceable-yjs"); // leave
        window.addEventListener("beforeunload", leave);
        const p = new LiveblocksYjsProvider(room, doc);
        p.once("synced", () => {
            console.log("loaded from liveblocks")
            resolve();
        });
    });
}