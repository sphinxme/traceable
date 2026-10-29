import type { Journal } from "$lib/document/entities/journal.svelte";
import type { Store } from "$lib/document/entities/store.svelte";
import type { Task } from "$lib/document/entities/task.svelte";
import type {
  PanelState,
  PanelStateEntry,
} from "$lib/document/panel-state/panel-state";
import { findAllOccurrencePaths } from "$lib/document/search";
import type { FocusService } from "$lib/interaction/focus-service";
import { TransitionRun } from "$lib/interaction/transition-run";
import {
  REVEAL_HIGHLIGHT_MS,
  samePath,
  type AnimateSpec,
  type NavResult,
  type OccurrenceRef,
  type OpResult,
  type PerformResult,
  type PerformSpec,
  type RevealOpts,
  type ScrollState,
} from "$lib/protocol";
import { devAssert, devWarn, devWarnOnce } from "$lib/utils";
import { settle } from "./settle";
import { ViewRegistry } from "./view-registry.svelte";
import type { ViewHandle } from "./view-handle.svelte";

/**
 * 面板能力接口：id = panelStateKey（G9 同键至多一个活动实例）。
 *
 * 面板 = 若干 home 树的容器 + 数据域搜索 + reveal + perform 宿主；设备份能力刻意最小，
 * 导航能力只在 EditorPanel 上暴露（JournalPanel 无 navigate/popTo/zoomInto）。
 */
export interface Panel {
  readonly id: string;
  readonly registry: ViewRegistry;
  /** PanelState 响应式访问（= panelState.entry(id)）。 */
  readonly foldTrees: PanelStateEntry;
  /** 数据域搜索（方言差异见子类实现）。 */
  findOccurrencePaths(taskId: string): OccurrenceRef[];
  reveal(
    ref: OccurrenceRef,
    opts?: RevealOpts,
  ): Promise<ViewHandle | undefined>;
  /** 流程唯一所有者（宿主契约见 panel.md §3）。 */
  perform(spec: PerformSpec): Promise<PerformResult>;
}

/** 环境是否支持 View Transitions（旧 WebView → 降级非动画路径）。 */
function vtSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function"
  );
}

/**
 * 公共基类：挂载索引 + 折叠访问 + perform 编排 + reveal。
 *
 * 每个面板持有自己的 ViewRegistry 与 PanelStateEntry；面板实例由组件创建，
 * 构造后向 PanelDirectory / CrossPanelFacade 注册（生命周期归组件 effect）。
 */
export abstract class PanelBase implements Panel {
  readonly id: string;
  readonly store: Store;
  readonly registry: ViewRegistry;
  readonly foldTrees: PanelStateEntry;
  /**
   * 会话级滚动记忆（非响应 Map）；读写者 = 面板组件滚动接线。
   * 键：编辑器 = homeId；Journal = 保留键 "__panel__"。
   */
  scrollMemory = new Map<string, ScrollState>();

  #focus: FocusService;

  constructor(
    id: string,
    store: Store,
    panelState: PanelState,
    focus: FocusService,
  ) {
    this.id = id;
    this.store = store;
    this.registry = new ViewRegistry(id);
    this.foldTrees = panelState.entry(id);
    this.#focus = focus;
  }

  abstract findOccurrencePaths(taskId: string): OccurrenceRef[];

  /**
   * 呈现复合动作：归一化 → expandAlong → settle → resolve → 呈现。
   *
   * 1. `normalizeRef` 把搜索地址转成挂载地址（编辑器可跨 home 自动导航）；
   * 2. 沿目标祖先链展开折叠树（写 FoldTree，非条目实例镜像）；
   * 3. await settle() 后 resolve —— 折叠/导航造成的挂载变化此时才稳定；
   * 4. 可选滚动与高亮（高亮截止时刻写入条目实例，定时清理由组件负责）。
   *
   * `normalizeRef` 返回 undefined 表示不可达（门面决定提示）；resolve miss 同样返回 undefined。
   */
  async reveal(
    ref: OccurrenceRef,
    opts?: RevealOpts,
  ): Promise<ViewHandle | undefined> {
    const mounted = await this.normalizeRef(ref);
    if (!mounted) return undefined;

    this.foldTrees.tree(mounted.homeId).expandAlong(mounted.path);
    await settle();

    const handle = this.registry.resolve(mounted);
    if (handle && opts?.scroll) handle.scrollIntoView();
    if (handle && opts?.highlight) {
      handle.highlightUntil = Date.now() + REVEAL_HIGHLIGHT_MS;
    }
    return handle;
  }

  /** 搜索地址 → 挂载地址（reveal 私有步）；EditorPanel 归一化 / JournalPanel 恒等。 */
  protected abstract normalizeRef(
    ref: OccurrenceRef,
  ): Promise<OccurrenceRef | undefined>;

  // —— 流程编排（宿主契约 P1–P6）——

  /**
   * 一次交互的唯一编排入口。
   *
   * 非动画路径：`op()` → [ok 且有 focus] settle → FocusService.requestFocus。
   * 动画路径：TransitionRun.nameSource（同步 DOM 写）→ startViewTransition(
   *   op → run.record/abort → settle → run.nameTarget
   * ) → await run.done → await vt.finished（吞 reject）→ cleanup → [ok 且有 focus] requestFocus。
   *
   * 契约（P1–P6）：
   * - P1：`spec.op()` 至多执行一次；抛异常视同 `{ok:false, reason:"invalid"}`；
   * - P2：animate 存在时 nameSource 先于 startViewTransition，op 在其回调内执行；
   * - P3：Registry 读取只发生在 settle 之后（nameTarget）；cleanup 用记录的条目实例，不 re-resolve；
   * - P4：`spec.focus` 仅在结果 ok 时消费（动画路径含 skip：数据已变更，焦点照常）；
   * - P5：结果必 resolve——skip 与异常均收敛为返回值，无悬挂 promise；
   * - P6：并发 perform 不互斥、不排队；后到者隐式 skip 前者动画，各自完成簿记。
   *
   * 环境无 View Transitions 时剥离 animate 走非动画路径；startViewTransition 同步抛错时
   * 清源命名后重入非动画路径（op 尚未执行，保证恰一次）。
   */
  async perform(spec: PerformSpec): Promise<PerformResult> {
    // 降级：环境无 View Transitions——剥离 animate 走非动画路径，focus 保留
    if (spec.animate && !vtSupported()) {
      devWarnOnce(
        "vt-unavailable",
        "startViewTransition unavailable; animate degraded",
      );
      spec = { ...spec, animate: undefined };
    }

    // 非动画路径（insert/split/link/unlink/remove/nav-无动画/降级）
    if (!spec.animate) {
      let result: OpResult | NavResult;
      try {
        result = spec.op();
      } catch {
        result = { ok: false, reason: "invalid" };
      }
      if (result.ok && spec.focus) {
        try {
          await settle();
        } catch {
          devWarn("settle threw; focus skipped");
          return result;
        }
        this.#focus.requestFocus(spec.focus);
      }
      return result;
    }

    // 动画路径
    const run = new TransitionRun(this, spec.animate);
    run.nameSource();

    let vt: ViewTransition;
    try {
      vt = document.startViewTransition(async () => {
        let result: OpResult | NavResult;
        try {
          result = spec.op();
        } catch {
          result = { ok: false, reason: "invalid" };
        }
        if (!result.ok) {
          run.abort(result);
          return;
        }
        run.record(result);
        try {
          await settle();
        } catch {
          devWarn("settle threw; nameTarget skipped");
          return;
        }
        run.nameTarget();
      });
    } catch (error) {
      // startViewTransition 同步抛：清源命名后重入非动画路径（op 未执行过，恰一次）
      devWarn("startViewTransition threw; degrade", error);
      run.cleanup();
      return this.perform({ op: spec.op, focus: spec.focus });
    }

    vt.ready?.catch((e) => devWarn("vt.ready rejected", e));
    vt.updateCallbackDone?.catch((e) => devWarn("vt callback threw", e));

    const result = await run.done;
    try {
      await vt.finished;
    } catch {
      // skip：数据已变更，簿记照常（P6）
    } finally {
      run.cleanup();
    }

    if (result.ok && spec.focus) {
      this.#focus.requestFocus(spec.focus);
    }
    return result;
  }
}

/**
 * 编辑器面板：受导航控制的单 home 面板（任意时刻 1 个 home）。
 *
 * - 导航栈持久在 Yjs（PanelStateEntry.navPaths），`navTaskList` 是派生净化结果；
 * - 数据域搜索从 navRoot 出发，不受当前 zoom 位置限制；
 * - `navigate/popTo/zoomInto` 是 nav-op 糖，统一走 perform；
 * - `reveal` 的归一化可在跨 home 时自动导航。
 */
export class EditorPanel extends PanelBase {
  /** 面包屑第一项（UserManager 保证实体存在）。 */
  readonly navRootId: string;

  constructor(
    id: string,
    store: Store,
    panelState: PanelState,
    focus: FocusService,
    navRootId: string,
  ) {
    super(id, store, panelState, focus);
    this.navRootId = navRootId;
  }

  /** 持久导航栈（响应式读取）；唯一写者 = #setNavPaths。 */
  get navPaths(): string[] {
    return this.foldTrees.navPaths ?? [];
  }

  /**
   * 派生净化：沿持久 ids 逐个取存活 Task，失效即截断；全失效回退 navRoot。
   * 读 tasksVersion 响应任务增删；不回写原始栈。
   */
  navTaskList = $derived.by(() => {
    void this.store.tasksVersion;
    const out: Task[] = [];
    for (const taskId of this.navPaths) {
      const task = this.store.getTask(taskId);
      if (!task) break;
      out.push(task);
    }
    return out.length ? out : [this.#navRootTask()];
  });

  get currentHomeId(): string {
    return this.navTaskList.at(-1)!.id;
  }

  /** 派生值（非第二来源）；挂载前 undefined。 */
  currentHomeHandle = $derived(this.registry.root(this.currentHomeId));

  isRootHome = $derived(this.navTaskList.length === 1);

  #navRootTask(): Task {
    const task = this.store.getTask(this.navRootId);
    devAssert(task, `EditorPanel: navRoot "${this.navRootId}" missing`);
    return task!;
  }

  /** 唯一 navPaths 写点：整体替换持久化，派生自动回流。 */
  #setNavPaths(paths: Task[]): void {
    this.foldTrees.navPaths = paths.map((task) => task.id);
  }

  /** 数据域搜索（搜索地址方言）：从 navRoot 出发，不限当前 home。 */
  findOccurrencePaths(taskId: string): OccurrenceRef[] {
    return findAllOccurrencePaths(this.#navRootTask(), taskId).map((path) => ({
      panelId: this.id,
      homeId: this.navRootId,
      path,
    }));
  }

  // —— 导航（nav-op 糖）——

  /**
   * 导航到指定栈（栈首必须是 navRoot）。
   *
   * - 静态校验失败 → invalid；与当前栈相同 → 恒等短路（不启动过渡）；
   * - 真正导航写入 `navPaths`（Yjs），并尝试用新旧栈的延伸/截断关系推导 zoom 配对；
   * - 数据无变化时只产生 NavDescriptor，不触碰大纲拓扑。
   */
  navigate(paths: Task[]): Promise<PerformResult> {
    // ① 静态校验
    if (paths.length === 0 || paths[0].id !== this.navRootId) {
      return Promise.resolve({ ok: false, reason: "invalid" });
    }

    // ② 恒等短路：不启动过渡
    if (
      samePath(
        paths.map((t) => t.id),
        this.navTaskList.map((t) => t.id),
      )
    ) {
      return Promise.resolve({
        ok: true,
        change: {
          op: "navigated",
          panelId: this.id,
          homeId: this.currentHomeId,
          paths: this.navTaskList.map((t) => t.id),
        },
      });
    }

    // ③ 组装 nav-op（执行期重校验；写入 navPaths）
    return this.perform({
      op: () => {
        if (paths.some((task) => !this.store.tasks.has(task.id))) {
          return { ok: false, reason: "notFound" };
        }
        this.#setNavPaths(paths);
        return {
          ok: true,
          change: {
            op: "navigated",
            panelId: this.id,
            homeId: paths.at(-1)!.id,
            paths: paths.map((task) => task.id),
          },
        };
      },
      animate: this.#zoomPairing(paths),
    });
  }

  /**
   * zoom 配对：按新旧栈数据关系推导 item ↔ root（同一任务的两个身份）。
   *
   * - 新栈是旧栈的延伸（zoom-in）：源 = 新 home 在当前视图中的条目，目标 = 新页 root；
   * - 旧栈是新栈的延伸（zoom-out）：源 = 当前 root，目标 = 旧 home 在新视图中的条目；
   * - 其他关系（跳变）：返回 undefined，走无动画硬切。
   */
  #zoomPairing(next: Task[]): AnimateSpec | undefined {
    const currentIds = this.navTaskList.map((task) => task.id);
    const nextIds = next.map((task) => task.id);
    const isPrefix = (a: string[], b: string[]) =>
      a.length < b.length && a.every((id, i) => id === b[i]);

    // 延伸（zoom-into）：源 = 新 home 在当前视图中的条目
    if (isPrefix(currentIds, nextIds)) {
      const source = this.registry.resolve({
        panelId: this.id,
        homeId: currentIds.at(-1)!,
        path: nextIds.slice(currentIds.length),
      });
      if (!source) return undefined;
      return {
        kind: "zoom",
        source,
        target: { panelId: this.id, homeId: nextIds.at(-1)!, path: [] },
      };
    }

    // 截断（zoom-out）：源 = 当前页面 root，目标 = 旧 home 在新视图中的条目
    if (isPrefix(nextIds, currentIds)) {
      const source = this.currentHomeHandle;
      if (!source) return undefined;
      return {
        kind: "zoom",
        source,
        target: {
          panelId: this.id,
          homeId: nextIds.at(-1)!,
          path: currentIds.slice(nextIds.length),
        },
      };
    }

    // 跳变：无动画硬切
    return undefined;
  }

  popTo(index: number): Promise<PerformResult> {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.navTaskList.length
    ) {
      return Promise.resolve({ ok: false, reason: "invalid" });
    }
    return this.navigate(this.navTaskList.slice(0, index + 1));
  }

  zoomInto(handle: ViewHandle): Promise<PerformResult> {
    if (handle.panel !== this || handle.homeId !== this.currentHomeId) {
      return Promise.resolve({ ok: false, reason: "invalid" });
    }
    const sub: Task[] = [];
    for (const taskId of handle.path()) {
      const task = this.store.getTask(taskId);
      if (!task) return Promise.resolve({ ok: false, reason: "invalid" });
      sub.push(task);
    }
    return this.navigate([...this.navTaskList, ...sub]);
  }

  // —— reveal 私有步：搜索地址 → 挂载地址 ——

  /**
   * 搜索地址 → 挂载地址。
   *
   * - 目标已在当前 home 子树内：截取 currentHomeId 之后的 path，不导航；
   * - 跨 home：先 zoom 到目标父链（nav-op → perform），成功后目标父链即新 home，
   *   归一化结果为 `[目标]`；
   * - 父链失效或导航失败 → undefined（门面据此决定提示）。
   * 这是全链路唯一跨方言（搜索地址 / 挂载地址）桥。
   */
  protected async normalizeRef(
    ref: OccurrenceRef,
  ): Promise<OccurrenceRef | undefined> {
    devAssert(ref.panelId === this.id);

    // ① 目标在当前 home 子树内（含目标 = home）：不导航
    const index = ref.path.indexOf(this.currentHomeId);
    if (index !== -1) {
      return {
        panelId: this.id,
        homeId: this.currentHomeId,
        path: ref.path.slice(index + 1),
      };
    }

    // ② 跨 home：zoom 到目标父链（产品默认开启）
    const parentIds = ref.path.slice(0, -1);
    if (parentIds.some((taskId) => !this.store.tasks.has(taskId))) {
      return undefined;
    }
    const result = await this.navigate([
      this.#navRootTask(),
      ...parentIds.map((taskId) => this.store.getTask(taskId)!),
    ]);
    if (!result.ok) return undefined;

    return {
      panelId: this.id,
      homeId: parentIds.at(-1) ?? this.navRootId,
      path: ref.path.length === 0 ? [] : [ref.path.at(-1)!],
    };
  }
}

/**
 * 周历面板：多 home 面板（home 恒挂载、无导航）。
 *
 * home 由时间窗函数注入；journal.task 缺失时防御跳过，不能塌整个面板。
 * 搜索地址与挂载地址同形（无跨 home 导航），因此 reveal 归一化是恒等变换。
 */
export class JournalPanel extends PanelBase {
  /** 时间窗策略（注入）：窗口函数返回即 home 集。 */
  readonly journals: () => Journal[];

  constructor(
    id: string,
    store: Store,
    panelState: PanelState,
    focus: FocusService,
    journals: () => Journal[],
  ) {
    super(id, store, panelState, focus);
    this.journals = journals;
  }

  /** 渲染用 home 列表；journal.task 缺失 = 防御跳过 + devWarn。 */
  homes(): Task[] {
    const out: Task[] = [];
    for (const journal of this.journals()) {
      const task = this.store.getTask(journal.taskId);
      if (task) out.push(task);
      else devWarn("journal.task missing", journal.id);
    }
    return out;
  }

  /**
   * 数据域搜索：home 恒挂载 ⇒ 搜索地址 = 挂载地址。
   * 对每个存活 home 做 DAG 路径搜索，产出可直接 resolve 的 OccurrenceRef。
   */
  findOccurrencePaths(taskId: string): OccurrenceRef[] {
    const out: OccurrenceRef[] = [];
    for (const home of this.homes()) {
      for (const path of findAllOccurrencePaths(home, taskId)) {
        out.push({ panelId: this.id, homeId: home.id, path });
      }
    }
    return out;
  }

  /** Journal 无导航能力：搜索地址与挂载地址同形，恒等归一化。 */
  protected async normalizeRef(
    ref: OccurrenceRef,
  ): Promise<OccurrenceRef | undefined> {
    return ref;
  }
}
