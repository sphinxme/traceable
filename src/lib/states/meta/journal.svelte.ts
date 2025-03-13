import dayjs, { Dayjs } from "dayjs";
import * as Y from "yjs"
import { TaskProxy, TaskProxyManager } from "./task.svelte";

export type JournalType = "WEEK"

export class JournalProxyManager
// implements Iterable<JournalProxy> 
{
    constructor(
        private yMap: Y.Map<Y.Map<any>>,
        private taskFactory: TaskProxyManager,
    ) { }

    static genKey(time: Dayjs, type: JournalType) {
        return `${time.valueOf()}-${type}`
    }

    getOrCreateJournal(time: Dayjs, type: JournalType, text: string, note: string) {

        const key = JournalProxyManager.genKey(time, type);
        let data = this.yMap.get(key);
        if (data) {
            return new JournalProxy(data, this, this.taskFactory)
        }

        const task = this.taskFactory.newTask(text, note);
        data = this.yMap.set(key, JournalProxy.genYMap(time, type, task.id))
        return new JournalProxy(data, this, this.taskFactory);
    }
}


export class JournalProxy {

    public readonly id: string;
    public readonly time: Dayjs; // 毫秒时间戳
    public readonly type: JournalType;
    private readonly taskId: string;
    public readonly task: TaskProxy;

    public constructor(data: Y.Map<any>, manager: JournalProxyManager, private taskfactory: TaskProxyManager) {
        this.id = data.get("id");
        this.time = dayjs(data.get("time") as number);
        this.type = data.get("type");
        this.taskId = data.get("taskId");
        this.task = taskfactory.build(this.taskId)
    }

    public static genYMap(time: Dayjs, type: JournalType, taskId: string) {
        const id = JournalProxyManager.genKey(time, type);

        const map = new Y.Map(Object.entries({
            id,
            type,
            taskId,
            time: time.valueOf(),
        }));
        console.log(map)
        return map;
    }
}