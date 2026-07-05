import mitt, { type Emitter } from "mitt";

/**
 * 交互层事件总线 — 处理跨面板的**一次性命令**（fire-and-forget）。
 *
 * **与 `todolist/controller/eventbus.ts` 的关系：**
 * 两者独立存在，避免 `interaction/services → todolist/controller` 的反向依赖。
 * - `todolist/controller/eventbus.ts` — TodoList 内部事件（缩放过渡、拖拽）
 * - `interaction/eventbus.ts`（本文件）— 跨面板交互事件（焦点定位）
 *
 * **何时用事件总线 vs `$state`：**
 * - **一次性命令**（点击 → 滚动/高亮）→ 事件总线。事件消费即消失，无残留状态。
 * - **持续态**（hover 高亮开关）→ `$state` + `$derived`。需要持久化、新组件需读取当前值。
 *
 * **两种订阅方式：**
 * - **组件级**：在组件初始化阶段调用 {@link interactionBus$listen}，`$effect` 自动管理 on/off。
 * - **Action 级**：在 `onTodoReady`/`destroy` 中手动 `on`/`off`（适用于非组件类，如 `TodoFocusActions`）。
 */

/**
 * Week→Todo 焦点定位命令的载荷。
 *
 * 由 {@link TaskFocusService.focusTask} 在 DAG 搜索 + 循环定位后产出，
 * 通过 `'focus:todo'` 事件传递给 `TodoFocusActions` 消费。
 *
 * @property rootViewId 目标所在的根视图 ID（用于 root TodoView 匹配并展开祖先）
 * @property path       从根任务到目标任务的 taskId 路径（root → target）
 * @property viewId     目标 Todo 的精确 viewId（用于 Todo.svelte 精确匹配）
 */
export interface FocusTarget {
    rootViewId: string;
    path: string[];
    viewId: string;
}

/**
 * 交互层事件类型映射。
 *
 * | 事件 | 方向 | 触发方 | 消费方 |
 * |------|------|--------|--------|
 * | `'focus:eventSegment'` | Todo→Week | `EventIndicator` 点击 | `EventSegment` 滚动到视口 |
 * | `'focus:todo'` | Week→Todo | `EventSegment` 点击 | `TodoFocusActions` 展开/滚动/高亮 |
 */
export type InteractionEvents = {
    /** Todo→Week: 点击 EventIndicator → 滚动到对应 EventSegment */
    "focus:eventSegment": { eventId: string };
    /** Week→Todo: 点击 EventSegment → 展开/滚动/高亮对应 Todo */
    "focus:todo": FocusTarget;
};

/**
 * 交互层事件总线单例。
 *
 * 使用方式：
 * ```ts
 * // 发射
 * interactionBus.emit('focus:eventSegment', { eventId });
 *
 * // 组件级监听（自动清理）
 * interactionBus$listen('focus:eventSegment', ({ eventId }) => { ... });
 *
 * // Action 级监听（手动清理）
 * interactionBus.on('focus:todo', handler);
 * interactionBus.off('focus:todo', handler);
 * ```
 */
export const interactionBus: Emitter<InteractionEvents> = mitt<InteractionEvents>();

/**
 * 组件级订阅辅助函数 — 在组件初始化阶段调用，`$effect` 自动管理 on/off 生命周期。
 *
 * **适用场景**：Svelte 组件（如 `EventSegment.svelte`）需要在组件存活期间监听事件。
 *
 * **限制**：Svelte 5 的 `$effect` 只能在组件初始化阶段注册，不能在 `$effect` 回调内嵌套调用。
 * 需要在 `onTodoReady`/`destroy` 等运行时回调中订阅的场景，请直接使用
 * `interactionBus.on` / `interactionBus.off` 手动管理。
 *
 * @typeParam K 事件类型键
 * @param event   事件名称
 * @param handler 事件处理器
 *
 * @example
 * ```ts
 * // 在 EventSegment.svelte 组件初始化阶段
 * interactionBus$listen('focus:eventSegment', ({ eventId }) => {
 *     if (eventId === event.id) {
 *         container.scrollIntoView({ behavior: "smooth" });
 *     }
 * });
 * ```
 */
export function interactionBus$listen<K extends keyof InteractionEvents>(
    event: K,
    handler: (payload: InteractionEvents[K]) => void,
) {
    $effect(() => {
        interactionBus.on(event, handler);
        return () => {
            interactionBus.off(event, handler);
        };
    });
}
