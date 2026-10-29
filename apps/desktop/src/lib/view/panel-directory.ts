import { devAssert } from "$lib/utils";
import type { Panel } from "./panel.svelte";

/** app 级面板索引：panelId → Panel；G9 同 id 至多一个活动实例。 */
export class PanelDirectory {
  #panels = new Map<string, Panel>();

  /** 面板组件挂载 $effect 注册；同 id 重复注册 = 路由互斥被破坏 → dev throw。 */
  register(panel: Panel): void {
    devAssert(
      !this.#panels.has(panel.id),
      `PanelDirectory: duplicate panel "${panel.id}"`,
    );
    this.#panels.set(panel.id, panel);
  }

  /** 组件 cleanup 对称注销。 */
  unregister(panelId: string): void {
    this.#panels.delete(panelId);
  }

  get(panelId: string): Panel | undefined {
    return this.#panels.get(panelId);
  }

  all(): Panel[] {
    return [...this.#panels.values()];
  }
}
