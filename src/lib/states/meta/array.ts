import * as Y from "yjs";
import { Observable } from 'rxjs';
import { move } from "./array_utils";

export class YIterable<T> implements Iterable<T> {
    protected observableCache?: Observable<YIterable<T>>;
    protected constructor(
        protected yArray: Y.Array<string>,
        protected factory: (id: string) => T,
    ) { }

    /* 仅调换位置 */
    public move(id: string, newIndex: number) {
        this.yArray.doc?.transact(() => {
            move(this.yArray, id, newIndex);
        })
    }

    public isEmpty() {
        return this.yArray.length === 0;
    }

    public getId(index: number): string {
        return this.yArray.get(index);
    }

    public get(index: number): T | undefined {
        const id = this.yArray.get(index);
        if (!id) {
            return undefined;
        }
        return this.factory(id);
    }

    public get size(): number {
        return this.yArray.length;
    }

    public get $(): Observable<YIterable<T>> {
        if (!this.observableCache) {
            this.observableCache = new Observable<YIterable<T>>(subscriber => {
                subscriber.next(this);
                return YIterable.register(this.yArray, () => {
                    subscriber.next(this);
                })
            });
        }

        return this.observableCache;
    }

    public includes(id: string) {
        return this.yArray.toArray().includes(id)
    }

    /**
     * 直接插入
     */
    public _attach(itemId: string, index: number = this.yArray.length) {
        if (this.yArray.toArray().includes(itemId)) {
            throw new Error("duplicate id not allowed")
        }
        index = Math.min(index, this.yArray.length)
        this.yArray.insert(index, [itemId])
    }

    public _detach(itemId: string) {
        const index = this.yArray.toArray().findIndex(id => id === itemId);
        if (index === -1) {
            throw new Error("item not found");
        }
        this.yArray.delete(index);
    }

    public _delete(index: number) {
        this.yArray.delete(index);
    }

    [Symbol.iterator](): Iterator<T, any, any> {
        const iterator = this.yArray[Symbol.iterator]();
        const build = this.factory;
        return {
            next(): IteratorResult<T> {
                const { done, value } = iterator.next();
                // console.log({ done, value })
                if (done) {
                    return {
                        done,
                        value
                    }
                }
                return {
                    done,
                    value: build(value)
                }
            }
        }
    }

    protected static register<T>(y: Y.AbstractType<T>, callback: (event: T, transaction: Y.Transaction) => void) {
        y.observe(callback);
        return () => {
            y.unobserve(callback);
        }
    }

}

