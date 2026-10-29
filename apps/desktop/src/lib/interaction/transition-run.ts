import type {
  AnimateKind,
  NavResult,
  OccurrenceRef,
  OpResult,
  ViewPart,
} from "$lib/protocol";
import { devWarn } from "$lib/utils";
import type { Panel } from "$lib/view/panel.svelte";
import type { ViewHandle } from "$lib/view/view-handle.svelte";

/**
 * TransitionRun：一次动画的记账对象（无自身时序与异步）。
 *
 * 持有配对上下文（nonce / parts / 两端 / 结果），全部交互 = perform 在固定时点调方法。
 * 与 DOM 的唯一接触点 = 经 ViewHandle 接线闭包写 style.viewTransitionName。
 */
export class TransitionRun {
  static #seq = 0;

  /** `vt-N`——全局单调的 run 前缀（跨面板共享，避免残留命名被后续过渡误配对）。 */
  readonly nonce: string;
  readonly parts: readonly ViewPart[];
  /** 目标面板（nameTarget 的 resolve 宿主；跨面板拖拽时 ≠ 源面板）。 */
  readonly panel: Panel;
  /** I3：op 提交后仅可经其接线闭包做 no-op（cleanup）。 */
  readonly source: ViewHandle;
  /** 地址而非条目实例——settle 时才 resolve（G7）。 */
  readonly target: OccurrenceRef;
  /** record/abort 落定的结果真值；perform 的唯一结果来源。 */
  readonly done: Promise<OpResult | NavResult>;

  #resolveDone!: (r: OpResult | NavResult) => void;
  /** nameTarget 时记录——cleanup 用，不再 re-resolve。 */
  #targetHandle?: ViewHandle;
  #state: "sourced" | "committed" | "aborted" | "cleaned" = "sourced";

  constructor(
    panel: Panel,
    animate: {
      kind: AnimateKind;
      source: ViewHandle;
      target: OccurrenceRef;
    },
  ) {
    this.nonce = `vt-${++TransitionRun.#seq}`;
    this.parts = animate.kind === "zoom" ? ["title", "list"] : ["self"];
    this.panel = panel;
    this.source = animate.source;
    this.target = animate.target;
    this.done = new Promise((resolve) => {
      this.#resolveDone = resolve;
    });
  }

  /** 同一 run 的每个 part 必须独立命名（同快照内重名会让浏览器跳过过渡）。 */
  #nameOf(part: ViewPart): string {
    return `${this.nonce}-${part}`;
  }

  /** 仅 sourced 态；perform 在 startViewTransition 前调用（同步 DOM 写，G8）。 */
  nameSource(): void {
    if (this.#state !== "sourced") return;
    for (const part of this.parts) {
      this.source.setTransitionName(part, this.#nameOf(part));
    }
  }

  /** 回调内 op 成功后（settle 之前）调用：落定 done。 */
  record(r: OpResult | NavResult): void {
    if (this.#state !== "sourced") return;
    this.#state = "committed";
    this.#resolveDone(r);
  }

  /** 回调内 op 失败：只记账，不动命名（abort 时清名会叠加淡出重影）。 */
  abort(r: OpResult | NavResult): void {
    if (this.#state !== "sourced") return;
    this.#state = "aborted";
    this.#resolveDone(r);
  }

  /** 仅 committed 态（settle 后）；状态守卫是 sub-frame 双输入的正确性依赖。 */
  nameTarget(): void {
    if (this.#state !== "committed") return;
    const handle = this.panel.registry.resolve(this.target);
    if (!handle) {
      devWarn("TransitionRun.nameTarget miss (strict resolve)", this.target);
      return;
    }
    this.#targetHandle = handle;
    for (const part of this.parts) {
      handle.setTransitionName(part, this.#nameOf(part));
    }
  }

  /** 幂等唯一出口；比较清除——只清自己写下的名字。 */
  cleanup(): void {
    if (this.#state === "cleaned") return;
    this.#state = "cleaned";
    for (const part of this.parts) {
      this.source.clearTransitionName(part, this.#nameOf(part));
      this.#targetHandle?.clearTransitionName(part, this.#nameOf(part));
    }
  }
}
