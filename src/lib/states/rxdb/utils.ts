import ObjectID from "bson-objectid";
import {
    filter,
    type Observable,
    type OperatorFunction,
    pipe,
    type UnaryFunction,
} from "rxjs";

export const id = () => {
    return ObjectID().toHexString();
};

export function filterNullish<T>(): UnaryFunction<
    Observable<T | null | undefined>,
    Observable<T>
> {
    return pipe(
        filter((x) => x != null) as OperatorFunction<T | null | undefined, T>,
    );
}
