import { readable, writable } from "svelte/store";
import * as Y from "yjs";

export function yStore(yText: Y.Text | undefined) {
    if (!yText) {
        console.error("empty yText");
        return readable("");
    }

    const listener = () => {
        data.set(yText.toJSON());
    };
    yText.observe(listener);
    const data = writable(yText.toJSON(), (set) => {
        return () => {
            yText.unobserve(listener);
        };
    });

    return data;
}
