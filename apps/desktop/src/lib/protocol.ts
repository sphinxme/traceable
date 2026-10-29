/**
 * 跨层共享协议：地址、结果、描述符、流程载荷与纯函数。
 *
 * 全链路唯一的地址/结果/载荷类型定义处（G11 的类型层落实）：
 * - 零运行时依赖（ViewHandle / Task 仅 `import type`，编译期擦除）；
 * - 只放跨 ≥2 层引用的纯数据形状 + 无状态纯函数；
 * - 不放行为逻辑、服务、状态、序列化——技术细节留在各层实现。
 *
 * 地址方言（OccurrenceRef）：
 * - 搜索地址：数据域搜索产出（EditorPanel 从 navRoot 出发 / JournalPanel 遍历 home）；
 * - 挂载地址：能解析成条目实例（ViewHandle）的形式（homeId 为当前挂载树的根）；
 * - 方言是生产者约定，不是类型差异；唯一跨方言桥 = Panel.reveal 的 normalizeRef。
 *
 * 纯函数是跨层唯一实现：各层禁止自写第二套等值/校验/推导。
 */

import type { Task } from "$lib/document/entities/task.svelte";
import type { ViewHandle } from "$lib/view/view-handle.svelte";

// —— 地址 ——

/** 出现地址：全链路唯一地址形式。path 不含 home、含目标；空数组合法（目标 = home 根）。 */
export interface OccurrenceRef {
  /** = panelStateKey；同键同时至多一个活动 Panel（路由互斥）。 */
  panelId: string;
  /** 该出现所属 home 的根 taskId。 */
  homeId: string;
  /** 从 home（不含）到目标（含）的 taskId 序列。 */
  path: string[];
}

/** 边引用：结构操作的作用对象，两端为实体 id。 */
export interface EdgeRef {
  parentTaskId: string;
  childTaskId: string;
}

// —— 结果与描述符 ——

export type OpFailReason = "cycle" | "duplicate" | "notFound" | "invalid";

/** 结构操作结果；ok 时携带 post-state 描述符。 */
export type OpResult =
  { ok: true; change: ChangeDescriptor } | { ok: false; reason: OpFailReason };

/** 预检结果：谓词无副作用、无 post-state。 */
export type CheckResult = { ok: true } | { ok: false; reason: OpFailReason };

/** 导航结果；错误面与 OpResult 共用。 */
export type NavResult =
  { ok: true; change: NavDescriptor } | { ok: false; reason: OpFailReason };

/** post-state 事实——纯实体键，不含出现上下文。 */
export type ChangeDescriptor =
  | { op: "inserted"; taskId: string; parentTaskId: string; toIndex: number }
  | {
      op: "split";
      fromTaskId: string;
      newTaskId: string;
      parentTaskId: string;
      toIndex: number;
    }
  | {
      op: "moved";
      taskId: string;
      fromParentTaskId: string;
      toParentTaskId: string;
      toIndex: number;
      kind: "reorder" | "reparent";
    }
  | { op: "linked"; taskId: string; parentTaskId: string }
  | { op: "unlinked"; taskId: string; parentTaskId: string }
  | {
      op: "removed";
      taskId: string;
      fromParentTaskId: string;
      cascaded: boolean;
    };

/** 导航结果描述符。 */
export interface NavDescriptor {
  op: "navigated";
  panelId: string;
  /** 新 home。 */
  homeId: string;
  /** 新导航栈（全 id）。 */
  paths: string[];
}

/** 折叠视图效果（概念母类型）；ops 各签名使用内联裁剪形态。 */
export interface ViewEffect {
  /** 被改出现的原地址（折叠迁移源 / 被销毁出现的折叠子树）。 */
  from?: OccurrenceRef;
  /** 落点地址（折叠迁移目标 / 新出现）。 */
  to?: OccurrenceRef;
}

// —— 流程 ——

/** 动画类别：item-move（Tab/untab/drop-move）· zoom（item ↔ root 配对）。 */
export type AnimateKind = "item-move" | "zoom";

/** 可命名的 DOM part（W2 归属表）。 */
export type ViewPart = "self" | "title" | "list";

/** 动画配对上下文；source 仅 op 提交前有效（I3），target 为挂载方言（settle 后 resolve）。 */
export interface AnimateSpec {
  kind: AnimateKind;
  source: ViewHandle;
  target: OccurrenceRef;
}

/** 焦点恢复请求；ref 恒为挂载方言。 */
export interface FocusRequest {
  ref: OccurrenceRef;
  /** Quill selection 索引（UTF-16 code unit）；可为负（走法层级补偿）。 */
  cursor: number;
}

/** 一次交互的完整意图；组装后不可改写，perform 是唯一消费者。 */
export interface PerformSpec {
  /** 结构操作或导航操作闭包：至多执行一次；抛异常视同 invalid。 */
  op: () => OpResult | NavResult;
  animate?: AnimateSpec;
  focus?: FocusRequest;
}

/** perform 返回值；结果必 resolve。 */
export type PerformResult =
  | { ok: true; change: ChangeDescriptor | NavDescriptor }
  | { ok: false; reason: OpFailReason };

/** 拖拽会话载荷：拖起时定格，此后不可变。 */
export interface DragPayload {
  task: Task;
  edge: EdgeRef;
  from: OccurrenceRef;
  /** 仅 op 提交前有效（I3）。 */
  sourceHandle: ViewHandle;
}

/** 放置槽：TaskDropable 的 props 聚合（组件 $derived 产出）。 */
export interface DropSlot {
  /** 放置槽所属列表的父条目实例。 */
  parentHandle: ViewHandle;
  /** 目标列表当前态插入槽位；post-state 换算唯一在 ops。 */
  index: number;
}

// —— 杂项 ——

/** 滚动记忆值。 */
export interface ScrollState {
  scrollTop: number;
  scrollLeft: number;
}

/** Panel.reveal 呈现选项；缺省 = 只展开 + 按地址找回条目实例。 */
export interface RevealOpts {
  scroll?: boolean;
  highlight?: boolean;
}

/** reveal 后高亮持续时长。 */
export const REVEAL_HIGHLIGHT_MS = 3000;

// —— 纯函数（唯一实现） ——

/** 路径等值：逐项相等；同引用短路。 */
export function samePath(a: string[], b: string[]): boolean {
  return a === b || (a.length === b.length && a.every((id, i) => id === b[i]));
}

/** 结构等值：两出现地址是否同一出现。 */
export function sameOccurrence(a: OccurrenceRef, b: OccurrenceRef): boolean {
  return (
    a.panelId === b.panelId && a.homeId === b.homeId && samePath(a.path, b.path)
  );
}

/** 落点父 id：path 的倒数第二个元素，长度 ≤1 时为 homeId。 */
export function toParentOf(ref: OccurrenceRef): string {
  return ref.path.at(-2) ?? ref.homeId;
}

/** 结构校验：不校验实体存在性。 */
export function isValidRef(ref: OccurrenceRef): boolean {
  return (
    typeof ref.panelId === "string" &&
    ref.panelId.length > 0 &&
    typeof ref.homeId === "string" &&
    ref.homeId.length > 0 &&
    Array.isArray(ref.path) &&
    ref.path.every((id) => typeof id === "string" && id.length > 0)
  );
}
