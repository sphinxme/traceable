/**
 * Todo → Week 方向的事件高亮服务。
 *
 * 当用户在 Todo 列表中悬停或点击一个 EventIndicator 时，通过本服务
 * 通知对应的 Week EventSegment 做出视觉响应（放大/阴影/滚动）。
 *
 * **两种交互态：**
 * - **持续高亮**（hover）：由 {@link setHighlight} / {@link isHighlighted} 管理，
 *   使用 `Record<string, boolean>` 记录每个 event 的高亮开关。
 * - **一次性聚焦**（click）：由 {@link requestFocus} 写入 {@link focusRequest}，
 *   消费者只读不写，消除旧方案中 `$effect` 内自写状态的问题。
 *
 * **设计要点：**
 * - `focusRequest` 每次赋新对象 `{ eventId }`，引用变化触发 `$effect`。
 * - 消费者（EventSegment）**只读** `focusRequest`，不写回，
 *   避免了旧 `focusing[id] = false` 的读-写循环。
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
     * 一次性聚焦请求。
     *
     * 每次 {@link requestFocus} 赋新对象，引用变化触发消费者的 `$effect`。
     * 消费者（EventSegment）读取后执行 `scrollIntoView`，**不需要写回清除**。
     *
     * - `null` 表示无待处理的聚焦请求。
     * - 非 `null` 时，消费者应匹配 `eventId` 决定是否响应。
     */
    public focusRequest = $state<{ eventId: string } | null>(null);

    /**
     * 发起一次性聚焦请求。
     *
     * 由 EventIndicator 的 click 事件调用。
     * 赋新对象到 {@link focusRequest}，触发 EventSegment 的 `$effect`
     * 执行 `scrollIntoView`。
     *
     * @param eventId 要聚焦的事件 ID
     */
    requestFocus(eventId: string): void {
        this.focusRequest = { eventId };
    }
}
