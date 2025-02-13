import ObjectID from "bson-objectid";
import * as Y from "yjs";

import {
    filter,
    type Observable,
    type OperatorFunction,
    pipe,
    type UnaryFunction,
} from "rxjs";
import { readable, writable } from "svelte/store";

export const id = () => ObjectID().toHexString();

export function filterNullish<T>(): UnaryFunction<
    Observable<T | null | undefined>,
    Observable<T>
> {
    return pipe(
        filter((x) => x != null) as OperatorFunction<T | null | undefined, T>,
    );
}

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