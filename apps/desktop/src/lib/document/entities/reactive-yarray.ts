import * as Y from "yjs";
import { createYArraySubscriber } from "./reactive-yjs";

/**
 * Y.Array<string> 的响应式代理：底层存 ID 列表，读取时经 mapper 惰性解析为实体
 * （Task/Event 等，解析走 Store 缓存）。所有读取方法内部先 subscribe() 注册响应式依赖。
 *
 * _attach / _detach 为链接维护的内部方法，由 Task 在事务中成对调用，
 * 同步维护 children / parents 双向链接。
 */
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

  /** 将 id 对应项移动到 newIndex（越界自动收敛），事务中执行。 */
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

  /** 内部：插入 ID（默认追加到末尾），已存在则抛错。 */
  _attach(itemId: string, index: number = this.yArray.length) {
    if (this.includes(itemId)) {
      throw new Error("duplicate id not allowed");
    }
    index = Math.min(index, this.yArray.length);
    this.yArray.insert(index, [itemId]);
  }

  /** 内部：按 ID 移除，不存在则抛错。 */
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
      },
    };
  }
}
