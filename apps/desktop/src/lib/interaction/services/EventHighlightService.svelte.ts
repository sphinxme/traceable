import { interactionBus } from "../eventbus.svelte";

/**
 * Todo → Week 方向的事件高亮服务。
 *
 * 当用户在 Todo 列表中悬停或点击一个 EventIndicator 时，通过本服务
 * 通知对应的 Week EventSegment 做出视觉响应（放大/阴影/滚动）。
 *
 * **两种交互态，两种通信机制：**
 *
 * - **持续高亮**（hover）：由 {@link setHighlight} / {@link isHighlighted} 管理，
 *   使用 `$state<Record<string, boolean>>` 记录每个 event 的高亮开关。
 *   这是**真正的持续态** — 需要持久化、新挂载组件需读取当前值 → 适用 `$state` + `$derived`。
 *
 * - **一次性聚焦**（click）：由 {@link requestFocus} 通过 {@link interactionBus}
 *   发射 `'focus:eventSegment'` 事件。这是 **fire-and-forget 命令** — 事件消费即消失，
 *   无残留状态 → 适用 mitt 事件总线，而非 `$state`。
 *
 * **设计要点：**
 * - 持续高亮使用 `$state`，消费者通过 `$derived(isHighlighted(id))` 响应式读取。
 * - 一次性聚焦使用 mitt 事件，消费者通过 `interactionBus$listen` 订阅。
 * - 两种机制各司其职，避免了旧方案中用 `$state` 模拟一次性命令导致的
 *   引用变更 hack、状态残留、只读约束等问题。
 */
export class EventHighlightService {
    /**
     * 持续高亮状态表 — `Record<eventId, boolean>`。
     *
     * 由 EventIndicator 的 hover 事件驱动写入，
     * 由 EventSegment 读取以决定是否显示放大 + 阴影效果。
     */
    private highlightMap = $state<Record<string, boolean>>({});

    /**
     * 设置某个事件的持续高亮状态。
     *
     * @param eventId 事件 ID
     * @param on      `true` = 高亮, `false` = 取消高亮
     */
    setHighlight(eventId: string, on: boolean): void {
        this.highlightMap[eventId] = on;
    }

    /**
     * 查询某个事件是否处于持续高亮状态。
     *
     * @param eventId 事件 ID
     * @returns `true` 如果当前高亮, 否则 `false`
     */
    isHighlighted(eventId: string): boolean {
        return this.highlightMap[eventId] ?? false;
    }

    /**
     * 发起一次性聚焦请求 — 滚动到对应的 Week EventSegment。
     *
     * 由 EventIndicator 的 click 事件调用。
     * 通过 {@link interactionBus} 发射 `'focus:eventSegment'` 事件，
     * 由 EventSegment 的 `interactionBus$listen` 监听器消费。
     *
     * 事件是 fire-and-forget 的：消费即消失，无残留状态，
     * 后续挂载的组件不会误读陈旧请求。
     *
     * @param eventId 要聚焦的事件 ID
     */
    requestFocus(eventId: string): void {
        interactionBus.emit("focus:eventSegment", { eventId });
    }
}
