import * as Y from "yjs";
import { distinctUntilChanged, map, Observable } from 'rxjs';
import { EventProxyIterable, EventProxyManager } from "./event.svelte";
import { YIterable } from "./array";

interface YTaskFactory {
    getYTask(id: string): Y.Map<any>;
    newYTask(textId: string, noteId: string): string; // 返回id
    deleteYTask(id: string): void
}

interface YTextFactory {
    getYText(textId: string): Y.Text;
    newYText(text?: string): string; // 返回id
    deleteYText(textId: string): void
}

export class TaskProxyManager {
    public eventproxyManager!: EventProxyManager;
    constructor(
        public readonly repository: YTaskFactory,
        public readonly textRepository: YTextFactory,
    ) { }

    private cache: Map<string, TaskProxy> = new Map();
    /**
     * 请务必从此工厂方法生成TaskProxy对象, 已经缓存
     */
    build(id: string): TaskProxy {
        const cached = this.cache.get(id);
        if (cached) {
            return cached;
        }

        const proxy = new TaskProxy(this.repository.getYTask(id), this);
        this.cache.set(id, proxy);
        return proxy;
    }

    private newTextAndNote(text?: string, note?: string): { textId: string, noteId: string } {
        const textId = this.textRepository.newYText(text);
        const noteId = this.textRepository.newYText(note);
        return { textId, noteId }
    }

    newTask(text = "", note = "") {
        const { textId, noteId } = this.newTextAndNote(text, note);
        const childId = this.repository.newYTask(textId, noteId);
        const child = this.build(childId);
        return child;
    }

    deleteTaskDeeply(task: TaskProxy) {
        for (const child of task.children) {
            task.deleteChild(child);
        }
        this.textRepository.deleteYText(task.noteId);
        this.textRepository.deleteYText(task.textId);
        this.repository.deleteYTask(task.id);
    }
}

// 封装task
export class TaskProxy {
    public readonly children: TaskProxyIterable;
    public readonly parents: TaskProxyIterable;
    public readonly events: EventProxyIterable;
    public readonly textId: string;
    public readonly noteId: string;
    public readonly id: string;
    private yText: Y.Text;
    private yNote: Y.Text;

    constructor(private yMap: Y.Map<any>, private manager: TaskProxyManager) {
        this.children = new TaskProxyIterable(this, yMap.get("children"), manager.build.bind(manager));
        this.parents = new TaskProxyIterable(this, yMap.get("parents"), manager.build.bind(manager));
        this.events = this.manager.eventproxyManager.makeIterableByIdList(this, yMap.get("events"));

        this.id = this.yMap.get("id");
        this.textId = yMap.get("textId");
        this.noteId = yMap.get("noteId");
        this.yText = manager.textRepository.getYText(this.textId);
        this.yNote = manager.textRepository.getYText(this.noteId);
    }

    public get text$(): Observable<string> {
        return registerYText(this.yText);
    }

    public get text(): Y.Text {
        return this.yText;
    }

    public get note$(): Observable<string> {
        return registerYText(this.yNote);
    }

    public get note(): Y.Text {
        return this.yNote;
    }

    // TODO:删掉
    private get status(): 'DONE' | 'TODO' | 'BLOCKED' {
        return this.yMap.get('status')
    }

    public get status$(): Observable<'DONE' | 'TODO' | 'BLOCKED'> {
        // 可优化点: 可以缓存Observable 多次调用status只返回同一个Observable, 减少浪费
        return new Observable<'DONE' | 'TODO' | 'BLOCKED'>(subscriber => {
            subscriber.next(this.status);

            return register(this.yMap, (event: Y.YMapEvent<any>, transaction: Y.Transaction) => {
                subscriber.next(this.status);
            })
        }).
            pipe(distinctUntilChanged());
    }

    public get isCompleted$(): Observable<boolean> {
        return this.status$.pipe(map(status => status === "DONE"))
    }

    public hasChildren(): boolean {
        return !this.children.isEmpty()
    }

    /**
     * 把现有的task挂上去, 同时更新task的parent列表
     */
    public attachChild(child: TaskProxy, index?: number) {
        if (child.parents.includes(child.id)) {
            throw new Error("duplicate child in one parent")
        }
        child.parents._attach(this.id);
        this.children._attach(child.id, index);
    }

    /**
     * 新增一个task, 然后挂上去
     */
    public insertChild(index?: number, text: string = "", note: string = "") {
        const child = this.manager.newTask(text, note)
        this.attachChild(child, index);
    }

    public detachChild(child: TaskProxy) {
        this.yMap.doc?.transact(() => {
            child.parents._detach(this.id);
            this.children._detach(child.id);
        });
    }

    /**
     * 从task上删掉, 如果这是最后parent, 那么就把它递归彻底删掉
     * 如果除了this之外还有其他的parent, 就只作detach
     */
    public deleteChild(child: TaskProxy) {
        if (child.parents.size > 1) {
            this.yMap.doc?.transact(() => {
                child.parents._detach(this.id);
                this.children._detach(child.id);
            });
            return;
        }

        this.yMap.doc?.transact(() => {
            this.yMap.doc?.transact(() => {
                this.children._detach(child.id);
                this.manager.deleteTaskDeeply(child);
            });
        });
    }

    public insertEvent(start: number, end: number) {
        const event = this.manager.eventproxyManager.createEvent(this, start, end);
        this.events._attach(event.id)
        return event;
    }

    public detachEvent(eventId: string) {
        this.events._detach(eventId);
    }

    public deepSearch(targetChildId: string) {
        this.parents

    }
}

class TaskProxyIterable extends YIterable<TaskProxy> {
    public constructor(
        public _parent: TaskProxy,
        yArray: Y.Array<string>,
        factory: (id: string) => TaskProxy,
    ) {
        super(yArray, factory);
    }
}

export type { TaskProxyIterable as TaskProxyArray };

function registerYText(yText: Y.Text): Observable<string> {
    // 可优化点: 可以缓存Observable 多次调用status只返回同一个Observable, 减少浪费
    return new Observable<string>(subscriber => {
        subscriber.next(yText.toJSON())
        return register(yText, (event: Y.YTextEvent, transaction: Y.Transaction) => {
            subscriber.next(yText.toJSON())
        })
    })
}

function register<T>(y: Y.AbstractType<T>, callback: (event: T, transaction: Y.Transaction) => void) {
    y.observe(callback);
    return () => {
        y.unobserve(callback);
    }
}