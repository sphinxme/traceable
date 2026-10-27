<script lang="ts">
  /**
   * Weekly — 周日志面板：纵向平铺 15 个周日志（窗口覆盖 6 周前 → 8 周后），
   * 每个 Journal 渲染为一个独立的 TodoView（根控制器由 WeeklyJournalPanelController 创建）。
   * 列表当前按 新→旧 渲染，与预期的日志顺序（旧→新）相反，待修正（见 genTimes）。
   *
   * 滚动行为：首次打开定位到当前周（Focusable）；会话内已有记忆位置时
   * 改为恢复上次滚动位置（ScrollMemoryService.journal）。
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
  import { WeeklyJournalPanelController } from "./JournalPanelController.svelte";
  import { onMount } from "svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { getInteractionContext } from "$lib/interaction/context.svelte";

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

  const controller = new WeeklyJournalPanelController(
    panelId,
    panelState,
    rootTaskId,
    store,
  );

  const { scroll } = getInteractionContext();

  function isCurrentWeek(t: Dayjs) {
    return t.startOf("week").isSame(dayjs().startOf("week"));
  }
  // TODO:focus改成使用mitt + viewId触发

  let scrollAreaRef = $state<HTMLElement>(null as any);
  onMount(() => {
    if (scroll.journal[panelId]) {
      scrollAreaRef.scrollTo({
        top: scroll.journal[panelId].scrollTop,
        left: scroll.journal[panelId].scrollLeft,
        behavior: "instant",
      });
    }
    const update = () => {
      scroll.journal[panelId] = {
        scrollTop: scrollAreaRef.scrollTop,
        scrollLeft: scrollAreaRef.scrollLeft,
      };
    };
    // console.log({ scroll.journal });
    scrollAreaRef.addEventListener("scroll", update);
  });
</script>

<div
  class="flex h-full grow flex-col rounded bg-background pl-1 pr-0 shadow-xl"
  style:contain="content"
>
  <!-- <div class="pl-2 h-full overflow-y-auto"> -->
  <ScrollArea bind:ref={scrollAreaRef} class=" h-full pl-2">
    {#each controller.getJournalList() as weekDoc}
      <div>
        <Focusable
          focus={!scroll.journal[panelId] && isCurrentWeek(weekDoc.time)}
          inline="start"
        />
        <TodoView
          showTitle
          highlightTitle={isCurrentWeek(weekDoc.time)}
          controller={controller.getTodoController(weekDoc)}
        />
      </div>
    {/each}
  </ScrollArea>
</div>
