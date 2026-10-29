import * as Y from "yjs";
import type { Store } from "./store.svelte";
import {
  createYMapSubscriber,
  createYTextSubscriber,
  createYXmlFragmentDeepSubscriber,
} from "./reactive-yjs";
import { ReactiveYArrayProxy } from "./reactive-yarray";
import type { Event } from "./event.svelte";

/**
 * Task：无限嵌套的大纲条目，支持双向链接——一个子任务可同时挂多个父任务。
 *
 * Yjs 结构（Y.Map）：
 * - id / textId（指向 texts Map 中的 Y.Text 标题）/ noteDoc（Y.XmlFragment 富文本笔记）
 * - children: Y.Array<string>  子任务 ID 列表
 * - parents:  Y.Array<string>  父任务 ID 列表（双向链接的另一侧）
 * - events:   Y.Array<string>  关联 Event ID 列表
 * - status:   "TODO" | "DONE" | "BLOCKED"
 *
 * children / parents / events 经 ReactiveYArrayProxy 暴露，读取即注册响应式依赖。
 */
export class Task {
  readonly yMap: Y.Map<any>;
  private readonly store: Store;
  private readonly subscribe: () => void;
  private readonly subscribeText: () => void;
  private readonly subscribeNote: () => void;

  private _children?: ReactiveYArrayProxy<Task>;
  private _parents?: ReactiveYArrayProxy<Task>;
  private _events?: ReactiveYArrayProxy<Event>;

  /** 运行时类型标记，用于区分 Task 代理对象。 */
  static readonly __isTaskProxy = true;

  readonly id: string;
  readonly textId: string;
  readonly text: Y.Text;

  readonly noteDoc: Y.XmlFragment;

  constructor(yMap: Y.Map<any>, store: Store) {
    this.yMap = yMap;
    this.store = store;
    this.subscribe = createYMapSubscriber(yMap);

    this.id = this.yMap.get("id");
    this.textId = this.yMap.get("textId");
    this.text = this.store.getText(this.textId)!;

    this.noteDoc = this.yMap.get("noteDoc");

    this.subscribeText = createYTextSubscriber(this.text);
    this.subscribeNote = createYXmlFragmentDeepSubscriber(this.noteDoc);
  }

  /** 标题纯文本（响应式）。 */
  get $text() {
    this.subscribeText();
    return this.text.toJSON();
  }

  /** 笔记预览（响应式）：取首个非空文本块，其后仍有内容则以 "..." 截断，图片节点记为 "[图片]"。 */
  get $note() {
    this.subscribeNote();
    const noteDoc = this.noteDoc;
    if (!noteDoc) return "";

    const xmlFragment = noteDoc;
    let firstTextFound = false;
    let result = "";

    for (const child of xmlFragment.toArray()) {
      const text = this.extractTextFromNode(child);
      if (text.trim()) {
        if (!firstTextFound) {
          firstTextFound = true;
          result = text.trim();
        } else {
          return result + "...";
        }
      } else if (child instanceof Y.XmlElement && child.nodeName === "image") {
        if (!firstTextFound) {
          firstTextFound = true;
          result = "[图片]";
        } else {
          return result + "...";
        }
      }
    }

    return result;
  }

  private extractTextFromNode(node: any): string {
    if (node instanceof Y.XmlText) {
      return node.toString();
    }
    if (node instanceof Y.XmlElement) {
      const children = node.toArray();
      const texts = children
        .map((child: any) => this.extractTextFromNode(child))
        .filter(Boolean);
      return texts.join("");
    }
    return "";
  }

  /** 完成状态（响应式读写）。 */
  get status(): "DONE" | "TODO" | "BLOCKED" {
    this.subscribe();
    return this.yMap.get("status");
  }

  set status(value: "DONE" | "TODO" | "BLOCKED") {
    this.yMap.set("status", value);
  }

  done() {
    this.status = "DONE";
  }

  toggleStatus() {
    this.status = this.status === "DONE" ? "TODO" : "DONE";
  }

  get isCompleted(): boolean {
    return this.status === "DONE";
  }

  get children(): ReactiveYArrayProxy<Task> {
    if (!this._children) {
      const yArray = this.yMap.get("children") as Y.Array<string>;
      this._children = new ReactiveYArrayProxy<Task>(yArray, (taskId) =>
        this.store.getTask(taskId),
      );
    }
    return this._children;
  }

  get parents(): ReactiveYArrayProxy<Task> {
    if (!this._parents) {
      const yArray = this.yMap.get("parents") as Y.Array<string>;
      this._parents = new ReactiveYArrayProxy<Task>(yArray, (taskId) =>
        this.store.getTask(taskId),
      );
    }
    return this._parents;
  }

  get events(): ReactiveYArrayProxy<Event> {
    this.subscribe();
    if (!this._events) {
      const yArray = this.yMap.get("events") as Y.Array<string>;
      this._events = new ReactiveYArrayProxy<Event>(yArray, (eventId) =>
        this.store.getEvent(eventId),
      );
    }
    return this._events;
  }

  hasChildren(): boolean {
    return !this.children.isEmpty();
  }

  /**
   * 双向挂载子任务（事务中同时更新 child.parents 与 this.children）。
   *
   * 已挂载过则抛错——G1「同一 parent 下子节点唯一」的防御断言；
   * ops 执行前已用 checkAttach 排除 duplicate，正常链路不可达。
   * 唯一调用方是 OutlineOps（拓扑写者）与旧数据导入/测试。
   */
  attachChild(child: Task, index?: number) {
    if (child.parents.includes(this.id)) {
      throw new Error("duplicate child in one parent");
    }
    this.store.doc.transact(() => {
      child.parents._attach(this.id);
      this.children._attach(child.id, index);
    });
  }

  /**
   * 仅解除双向链接，双方任务均保留（不级联、不删实体）。
   * 与 Store.deleteEntity 的分工：先 detach 边，再由 ops 决定是否级联清实体。
   */
  detachChild(child: Task) {
    this.store.doc.transact(() => {
      child.parents._detach(this.id);
      this.children._detach(child.id);
    });
  }

  /** 创建并关联一个 Event。 */
  insertEvent(start: number, end: number) {
    const event = this.store.createEvent(this.id, start, end);
    return event;
  }

  /** 仅从 events 列表移除，不删除 Event 本体。 */
  detachEvent(eventId: string) {
    this.events._detach(eventId);
  }

  /** 序列化（链接与关联以 ID 列表表示）。 */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      textId: this.textId,
      status: this.status,
      children: this.children.toIds(),
      parents: this.parents.toIds(),
      events: this.events.toIds(),
    };
  }
}
