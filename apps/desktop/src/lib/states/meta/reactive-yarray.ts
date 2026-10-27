import * as Y from 'yjs';
import { createYArraySubscriber } from './reactive-yjs';

export class ReactiveYArrayProxy<T> implements Iterable<T> {
    private readonly yArray: Y.Array<string>;
    private readonly mapper: (id: string) => T | undefined;
    private readonly subscribe: () => void;

    constructor(yArray: Y.Array<string>, mapper: (id: string) => T | undefined) {
        this.yArray = yArray;
        this.mapper = mapper;
        this.subscribe = createYArraySubscriber(yArray);
    }

    get length(): number {
        this.subscribe();
        return this.yArray.length;
    }

    get size(): number {
        return this.length;
    }

    at(index: number): T | undefined {
        this.subscribe();
        const id = this.yArray.get(index);
        if (id === undefined) return undefined;
        return this.mapper(id);
    }

    getId(index: number): string {
        this.subscribe();
        return this.yArray.get(index);
    }

    toIds(): string[] {
        this.subscribe();
        return this.yArray.toArray();
    }

    toArray(): T[] {
        this.subscribe();
        const result: T[] = [];
        for (let i = 0; i < this.yArray.length; i++) {
            const id = this.yArray.get(i);
            const entity = this.mapper(id);
            if (entity !== undefined) {
                result.push(entity);
            }
        }
        return result;
    }

    isEmpty(): boolean {
        return this.length === 0;
    }

    findIndex(id: string): number {
        return this.yArray.toArray().indexOf(id);
    }

    getById(id: string): T | undefined {
        const index = this.findIndex(id);
        if (index === -1) return undefined;
        return this.at(index);
    }

    includes(id: string): boolean {
        return this.yArray.toArray().includes(id);
    }

    move(id: string, newIndex: number) {
        const array = this.yArray.toArray();
        const currentIndex = array.indexOf(id);
        if (currentIndex === -1) {
            throw new Error(`Item "${id}" not found in the array.`);
        }
        if (newIndex < 0) newIndex = 0;
        else if (newIndex > array.length - 1) newIndex = array.length - 1;
        if (currentIndex === newIndex) return;

        this.yArray.doc?.transact(() => {
            this.yArray.delete(currentIndex, 1);
            this.yArray.insert(newIndex, [id]);
        });
    }

    _attach(itemId: string, index: number = this.yArray.length) {
        if (this.includes(itemId)) {
            throw new Error("duplicate id not allowed");
        }
        index = Math.min(index, this.yArray.length);
        this.yArray.insert(index, [itemId]);
    }

    _detach(itemId: string) {
        const index = this.findIndex(itemId);
        if (index === -1) {
            throw new Error("item not found");
        }
        this.yArray.delete(index, 1);
    }

    [Symbol.iterator](): Iterator<T> {
        const arr = this.toArray();
        let i = 0;
        return {
            next(): IteratorResult<T> {
                if (i < arr.length) {
                    return { value: arr[i++], done: false };
                }
                return { value: undefined as any, done: true };
            }
        };
    }
}
