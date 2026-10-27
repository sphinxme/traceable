<script lang="ts">
  /**
   * Editor — Todo 编辑器面板：面包屑导航 + 当前 home 的大纲视图。
   *
   * 组装面板级依赖：从 Y.Doc 的 panelStates Map 取出（或创建）本面板的
   * `PanelStateStore`，构造 `EditorPanelController`，并把滚动能力接线给控制器
   * （注入 scrollTo、上报 onScroll、接线完成后经 onTodoReady 恢复滚动位置）。
   *
   * @prop panelId           面板唯一标识（/trace 与 /organize 的编辑器共用 "root"，跨页面共享导航路径）
   * @prop allPanelStateMap  Y.Doc 的 panelStates Map（panelId → 面板状态树）
   * @prop rootTaskId        导航栈根任务 ID
   */
  import * as Y from "yjs";
  import TodoView from "$lib/components/todolist/TodoView.svelte";
  import Navigator from "./Navigator.svelte";

  import { db } from "@/state";
  import { EditorPanelController } from "$lib/panels/PanelController.svelte";
  import { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";

  interface Props {
    panelId: string;
    allPanelStateMap: Y.Map<any>; // panelId-PanelStates
    rootTaskId: string;
  }

  let { panelId, allPanelStateMap, rootTaskId }: Props = $props();
  const panelStates = PanelStateStore.getOrCreateFromParentYMap(
    allPanelStateMap,
    panelId,
    rootTaskId,
  );

  const controller = new EditorPanelController(
    panelId,
    panelStates,
    rootTaskId,
    db.store,
  );
  let scrollAreaRef = $state<HTMLElement>(null as any);

  $effect(() => {
    controller.scrollTo = (top, left) => {
      scrollAreaRef.scrollTo({ top, left, behavior: "instant" });
    };
    scrollAreaRef.addEventListener("scroll", () => {
      controller.onScroll(scrollAreaRef.scrollTop, scrollAreaRef.scrollLeft);
    });
    controller.onTodoReady();
    return () => {
      controller.destroy();
    };
  });
</script>

<svelte:window onbeforeunload={() => controller.destroy()} />
<ScrollArea
  data-tauri-drag-region
  class="flex h-full grow flex-col overflow-auto rounded-lg bg-background py-4 pl-4 pt-2"
  bind:ref={scrollAreaRef}
>
  <!-- header -->
  <div data-tauri-drag-region class="flex flex-row px-0.5 py-2">
    <Navigator {controller} />
  </div>
  <div class="px-3">
    <TodoView
      showTitle={!controller.isRootHome}
      controller={controller.currentHomeController}
    />
  </div>
</ScrollArea>
