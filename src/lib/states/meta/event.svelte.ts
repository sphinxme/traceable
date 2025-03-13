import * as Y from "yjs";
import type { TaskProxy, TaskProxyManager } from "./task.svelte";
import { distinctUntilChanged, Observable } from "rxjs";
import { YIterable } from "./array";
import type { Dayjs } from "dayjs";

interface YEventRepository {
    getYEvent(id: string): Y.Map<any>;
    newYEvent(taskId: string, textId: string, start: number, end: number): string; // 返回id
    deleteYEvent(id: string): void
}

interface YTextRepository {
    getYText(textId: string): Y.Text;
    newYText(text?: string): string; // 返回id
    deleteYText(textId: string): void
}

export class EventProxyManager implements Iterable<EventProxy> {
    public constructor(
        private yMap: Y.Map<Y.Map<any>>,
        public readonly repository: YEventRepository,
        public readonly textRepository: YTextRepository,
        public readonly taskFactory: TaskProxyManager
    ) { }

    private cache = new Map<string, EventProxy>();

    build(id: string, task?: TaskProxy): EventProxy {
        if (this.cache.has(id)) {
            return this.cache.get(id)!;
        }
        const data = this.repository.getYEvent(id);
        const proxy = new EventProxy(data, this, task);
        this.cache.set(id, proxy);
        return proxy;
    }

    public makeIterableByIdList(task: TaskProxy, yArray: Y.Array<string>) {
        return new EventProxyIterable(task, yArray, this)
    }

    public get $(): Observable<EventProxyManager> {
        return new Observable<EventProxyManager>((subscriber) => {
            subscriber.next(this);
            return observe(this.yMap, () => {
                subscriber.next(this);
            })
        })
    }

    public queryByRange$(from: number, to: number): Observable<Iterable<EventProxy>> {
        return new Observable<Iterable<EventProxy, any, any>>(subscriber => {
            const callback = () => {
                const iterable = {
                    [Symbol.iterator]: () => {
                        return this.query((key, yEvent) => {
                            const start = yEvent.get("start") as number;
                            return from < start && start < to;
                        })
                    }
                }
                subscriber.next(iterable);
            }
            callback();
            return observe(this.yMap, callback)
        })
    }

    [Symbol.iterator](): Iterator<EventProxy> {
        return this.query(() => true)
    }

    private query(filter: (key: string, yEvent: Y.Map<any>) => boolean): Iterator<EventProxy> {
        const iterator = this.yMap[Symbol.iterator]();
        const manager = this;

        return {
            next() {
                while (true) {
                    const { done, value } = iterator.next();
                    if (done) {
                        return {
                            done,
                            value: undefined
                        }
                    }
                    const [key, yEvent] = value;

                    if (filter(key, yEvent)) {
                        return {
                            done,
                            value: new EventProxy(yEvent, manager)
                        }
                    }
                }
            }
        }
    }

    public createEvent(task: TaskProxy, start: number, end: number) {
        const textId = this.textRepository.newYText();
        const id = this.repository.newYEvent(task.id, textId, start, end);
        return this.build(id, task);
    }

    public delete(id: string) {
        this.yMap.delete(id);
    }
}

export class EventProxy {
    public readonly id: string;
    private yText: Y.Text;
    public readonly task: TaskProxy;


    public readonly textId: string;
    public constructor(
        private readonly data: Y.Map<any>,
        private manager: EventProxyManager,
        task?: TaskProxy,
    ) {
        this.id = this.data.get("id");
        this.textId = this.data.get("textId");
        this.yText = this.manager.textRepository.getYText(this.textId);
        if (!task) {
            const taskId = this.data.get("taskId");
            task = this.manager.taskFactory.build(taskId);
        }
        this.task = task;
    }

    public get text$(): Observable<string> {
        return observeYText(this.yText);
    }

    public get text(): Y.Text {
        return this.yText;
    }

    public get start$(): Observable<number> {
        return observeYAttr<number>(this.data, "start");
    }

    public get start(): number {
        return this.data.get("start")
    }
    public set start(value: number) {
        this.data.set("start", value);
    }

    public get end$(): Observable<number> {
        return observeYAttr<number>(this.data, "end");
    }

    public get end(): number {
        return this.data.get("end");
    }
    public set end(value: number) {
        if (value === this.end) {
            return;
        }
        this.data.set("end", value);
    }

    public setPeriod(start: number, end: number) {
        this.data.doc?.transact(() => {
            this.start = start;
            this.end = end;
        })
    }

    public moveTo(start: number) {
        if (start === this.start) {
            return;
        }
        const duration = this.end - this.start;
        this.setPeriod(start, start + duration);
    }

    public resizeTo(duration: number) {
        const newEnd = this.start + duration;
        this.end = newEnd;
    }

    public destory() {
        this.data.doc?.transact(() => {
            this.task.detachEvent(this.id);
            this.manager.delete(this.id);
        })

    }
}

export class EventProxyIterable extends YIterable<EventProxy> {
    public constructor(
        private task: TaskProxy,
        yArray: Y.Array<string>,
        manager: EventProxyManager,
    ) {
        super(yArray, (id) => {
            return manager.build(id, this.task)
        });
    }
}

function observeYAttr<T>(yMap: Y.Map<any>, key: string): Observable<T> {
    // 可优化点: 可以缓存Observable 多次调用status只返回同一个Observable, 减少浪费
    return new Observable<T>(subscriber => {
        subscriber.next(yMap.get(key));
        return observe(yMap, (event: Y.YMapEvent<any>, transaction: Y.Transaction) => {
            subscriber.next(yMap.get(key));
        })
    }).pipe(distinctUntilChanged())
}

function observeYText(yText: Y.Text): Observable<string> {
    // 可优化点: 可以缓存Observable 多次调用status只返回同一个Observable, 减少浪费
    return new Observable<string>(subscriber => {
        subscriber.next(yText.toJSON())
        return observe(yText, (event: Y.YTextEvent, transaction: Y.Transaction) => {
            subscriber.next(yText.toJSON())
        })
    })
}

function observe<T>(y: Y.AbstractType<T>, callback: (event: T, transaction: Y.Transaction) => void) {
    y.observe(callback);
    return () => {
        y.unobserve(callback);
    }
}