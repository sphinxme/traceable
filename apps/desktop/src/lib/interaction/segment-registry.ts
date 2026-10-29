/**
 * 事件段实例（`SegmentHandle`）——接线模式同 ViewHandle（组件 effect 内登记/接线/注销）。
 *
 * 事件段实例不参与寻址：一个 Event 跨天时会有多个段，由 `segStart` 选“离现在最近”。
 */
export interface SegmentHandle {
  readonly eventId: string;
  readonly dayIndex: number;
  /** 段起始时间戳——"离现在最近"选段依据。 */
  readonly segStart: number;
  scrollIntoView(): void;
  setHighlight(on: boolean): void;
}

/**
 * eventId → 事件段实例集合（一个 Event 跨天多段）；无响应性需求，纯 Map。
 *
 * `segmentsOf` 返回快照，调用方遍历期间并发注销安全；Set 空即删键，防 Map 无界增长。
 */
export class SegmentRegistry {
  #byEvent = new Map<string, Set<SegmentHandle>>();

  register(handle: SegmentHandle): void {
    let handles = this.#byEvent.get(handle.eventId);
    if (!handles) {
      handles = new Set();
      this.#byEvent.set(handle.eventId, handles);
    }
    handles.add(handle);
  }

  /** 对称删除；Set 空 → 删键（防 Map 无界长胖）。 */
  unregister(handle: SegmentHandle): void {
    const handles = this.#byEvent.get(handle.eventId);
    if (!handles) return;
    handles.delete(handle);
    if (handles.size === 0) this.#byEvent.delete(handle.eventId);
  }

  /** 拷贝快照（调用方遍历期间并发注销安全）。 */
  segmentsOf(eventId: string): SegmentHandle[] {
    return [...(this.#byEvent.get(eventId) ?? [])];
  }
}
