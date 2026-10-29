import type { PanelState } from "$lib/document/panel-state/panel-state";
import type { Store } from "$lib/document/entities/store.svelte";
import type { FocusService } from "$lib/interaction/focus-service";
import type { OccurrenceRef } from "$lib/protocol";
import { PanelBase } from "$lib/view/panel.svelte";

/**
 * perform / reveal 测试宿主：PanelBase 的最小真实子类。
 *
 * 与 FakePanel 的区别：FakePanel 只是结构替身（无编排行为）；TestPanel 继承真实编排，
 * 仅把搜索与地址归一化留空，供需要走 perform / reveal 的浏览器测试使用。
 */
export class TestPanel extends PanelBase {
  constructor(
    id: string,
    store: Store,
    panelState: PanelState,
    focus: FocusService,
  ) {
    super(id, store, panelState, focus);
  }

  findOccurrencePaths(_taskId: string): OccurrenceRef[] {
    return [];
  }

  protected async normalizeRef(
    ref: OccurrenceRef,
  ): Promise<OccurrenceRef | undefined> {
    return ref;
  }
}
