/**
 * 挂载世界装置：在 document fixture 之上提供 Panel 替身与挂载树搭建。
 *
 * - `makeFakePanel`：最小结构替身，只实现被测代码读取的字段，无编排行为；
 * - `makeViewFixture`：document fixture + FakePanel；
 * - `mountHandle`：绕过组件直接登记条目实例，供 node 测试搭挂载树。
 *
 * 需要真实 perform / reveal 编排时用 `TestPanel`；
 * 需要 effect 收口与真实 DOM 时用 `Harness*.svelte`。
 */
import type { Task } from "$lib/document/entities/task.svelte";
import type { PanelState } from "$lib/document/panel-state/panel-state";
import type { Panel } from "$lib/view/panel.svelte";
import { ViewHandle } from "$lib/view/view-handle.svelte";
import { ViewRegistry } from "$lib/view/view-registry.svelte";
import { makeDocumentFixture } from "./document";

/** 轻量 Panel 替身：commit 1 只消费 id / registry / foldTrees。 */
export type FakePanel = Panel & { registry: ViewRegistry };

export function makeFakePanel(
  panelState: PanelState,
  panelId = "panel",
): FakePanel {
  const registry = new ViewRegistry(panelId);
  return {
    id: panelId,
    registry,
    foldTrees: panelState.entry(panelId),
    findOccurrencePaths: () => [],
    reveal: async () => undefined,
    perform: async () => ({ ok: false, reason: "invalid" }),
  };
}

/** 文档装置 + 面板替身。 */
export function makeViewFixture(panelId = "panel") {
  const document = makeDocumentFixture();
  const panel = makeFakePanel(document.panelState, panelId);
  return { ...document, panel };
}

/** 构造并登记条目实例（node 测试直接搭挂载树）。 */
export function mountHandle(
  panel: Panel,
  task: Task,
  parent?: ViewHandle,
): ViewHandle {
  const handle = new ViewHandle(panel, task, parent);
  panel.registry.register(handle);
  return handle;
}
