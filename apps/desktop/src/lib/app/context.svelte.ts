import { PanelState } from "$lib/document/panel-state/panel-state";
import type { Database } from "$lib/document/entities/database.svelte";
import type { Store } from "$lib/document/entities/store.svelte";
import { DnDAdapter } from "$lib/components/adapters/dnd-adapter";
import { KeyboardAdapter } from "$lib/components/adapters/keyboard-adapter";
import { CrossPanelFacade } from "$lib/interaction/cross-panel-facade";
import { DragService } from "$lib/interaction/drag-service.svelte";
import { FocusService } from "$lib/interaction/focus-service";
import { KeyboardService } from "$lib/interaction/keyboard-service.svelte";
import { OutlineOps } from "$lib/outline-ops/ops";
import { PanelDirectory } from "$lib/view/panel-directory";

/**
 * app 级服务集合（组合根持有；面板实例由组件创建，不在此）。
 *
 * 构造顺序（依赖单向）：
 * `Database → Store/PanelState → OutlineOps → PanelDirectory → CrossPanelFacade
 *  → DragService/KeyboardService → FocusService → KeyboardAdapter/DnDAdapter`
 * 构造末尾执行 `panelState.sweep()`（装配时兜底清理孤儿折叠键）。
 *
 * `KeyboardService` 构造器内使用 `$effect`，因此本类必须在组件初始化上下文构造
 * （由 AppProvider 在 Y.Doc 加载完成后的 then 分支创建并注入）。
 */
export class AppServices {
  readonly database: Database;
  readonly store: Store;
  readonly panelState: PanelState;
  readonly ops: OutlineOps;
  readonly directory: PanelDirectory;
  readonly facade: CrossPanelFacade;
  readonly drag: DragService;
  readonly keyboard: KeyboardService;
  readonly focus: FocusService;
  readonly keyboardAdapter: KeyboardAdapter;
  readonly dndAdapter: DnDAdapter;

  constructor(db: Database) {
    this.database = db;
    this.store = db.store;
    this.panelState = new PanelState(this.store);
    this.ops = new OutlineOps(this.store, this.panelState);
    this.directory = new PanelDirectory();
    this.facade = new CrossPanelFacade();
    this.drag = new DragService();
    this.keyboard = new KeyboardService();
    this.focus = new FocusService(this.directory);
    this.keyboardAdapter = new KeyboardAdapter(this.ops);
    this.dndAdapter = new DnDAdapter(this.drag, this.ops);

    this.panelState.sweep();
  }
}

/**
 * 模块级单例：`getAppServices` 会被适配层在**事件处理栈内**调用，
 * 而 Svelte Context 只在组件初始化期可读（事件回调内 getContext 会 throw）——
 * 故此处以模块级引用承载注入；AppProvider 仍在组件初始化期调用 setAppServices。
 */
let services: AppServices | undefined;

/** AppProvider 初始化期调用（组件 script 顶层）。 */
export function setAppServices(next: AppServices): void {
  services = next;
}

/** 任意子组件/事件处理栈内获取；未注入即 throw。 */
export function getAppServices(): AppServices {
  if (!services) {
    throw new Error(
      "AppServices not set; call setAppServices during AppProvider init",
    );
  }
  return services;
}
