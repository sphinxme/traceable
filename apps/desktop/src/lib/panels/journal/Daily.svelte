<script lang="ts">
  /**
   * Daily — 日日志面板（预留，未接入路由）。
   *
   * 结构与 Weekly.svelte 相同：纵向平铺日日志，每个 Journal 渲染为一个独立的
   * TodoView（根控制器由 DailyJournalPanelController 创建）。与 Weekly 的差异：
   * - 无滚动位置记忆，每次打开都定位到今天（Focusable）
   * - 时间窗口为 [今天 → 今天+14]，不含过去日期（待修正，见控制器注释）
   * - rootTaskId 硬编码 "weekly" 系复制残留；日志面板不使用面包屑导航，暂无实际影响
   */
  // TODO: 支持无限滚动
  import * as Y from "yjs";
  import TodoView from "$lib/components/todolist/TodoView.svelte";
  import dayjs, { Dayjs } from "dayjs";
  import Focusable from "$lib/components/ui/focusable/Focusable.svelte";
  import type { Store } from "$lib/states/meta/store.svelte";
  import {
    PanelStateStore,
    type StateMap,
  } from "$lib/states/states/StatesTree.svelte";
  import { DailyJournalPanelController } from "./JournalPanelController.svelte";

  interface Props {
    store: Store;
    allPanelStates: Y.Map<StateMap>;
    panelId: string;
  }

  let { store, allPanelStates, panelId }: Props = $props();
  const rootTaskId = "weekly";

  const panelState = PanelStateStore.getOrCreateFromParentYMap(
    allPanelStates,
    panelId,
    rootTaskId,
  );

  const controller = new DailyJournalPanelController(
    panelId,
    panelState,
    rootTaskId,
    store,
  );

  function isCurrentDay(t: Dayjs) {
    return t.startOf("day").isSame(dayjs().startOf("day"));
  }
  // TODO:focus改成使用mitt + viewId触发
</script>

<div
  class="flex h-full grow flex-col rounded bg-background pl-1 pr-0 shadow-xl"
>
  <div class="h-full overflow-y-auto pl-2">
    {#each controller.getJournalList() as weekDoc (weekDoc.id)}
      <div>
        <Focusable focus={isCurrentDay(weekDoc.time)} inline="start" />
        <TodoView
          showTitle
          highlightTitle={isCurrentDay(weekDoc.time)}
          controller={controller.getTodoController(weekDoc)}
        />
      </div>
    {/each}
  </div>
</div>
