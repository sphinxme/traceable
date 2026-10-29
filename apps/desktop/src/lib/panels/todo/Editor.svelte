<script lang="ts">
  /**
   * Editor — 大纲编辑器面板：面包屑导航 + 当前 home 的大纲视图。
   *
   * 面板实例由本组件创建（AppServices 不持有面板）；挂载 effect 收口
   * PanelDirectory 与门面的注册/注销（G9/门面生命周期），滚动记忆归 panel.scrollMemory。
   */
  import TodoView from "$lib/components/todolist/TodoView.svelte";
  import Navigator from "./Navigator.svelte";

  import { EditorPanel } from "$lib/view/panel.svelte";
  import { getAppServices } from "$lib/app/context.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";

  interface Props {
    panelId: string;
    rootTaskId: string;
  }

  let { panelId, rootTaskId }: Props = $props();

  const services = getAppServices();
  const panel = new EditorPanel(
    panelId,
    services.store,
    services.panelState,
    services.focus,
    rootTaskId,
  );

  let scrollAreaRef = $state<HTMLElement | null>(null);

  $effect(() => {
    services.directory.register(panel);
    services.facade.registerTaskParticipant(panel);
    return () => {
      services.facade.unregisterTaskParticipant(panel);
      services.directory.unregister(panel.id);
    };
  });

  $effect(() => {
    const el = scrollAreaRef;
    if (!el) return;

    const homeId = panel.currentHomeId;
    const saved = panel.scrollMemory.get(homeId);
    if (saved) {
      el.scrollTo({
        top: saved.scrollTop,
        left: saved.scrollLeft,
        behavior: "instant",
      });
    }

    const onScroll = () => {
      panel.scrollMemory.set(homeId, {
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
      });
    };
    el.addEventListener("scroll", onScroll);
    return () => {
      panel.scrollMemory.set(homeId, {
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
      });
      el.removeEventListener("scroll", onScroll);
    };
  });
</script>

<ScrollArea
  data-tauri-drag-region
  class="flex h-full grow flex-col overflow-auto rounded-lg bg-background py-4 pl-4 pt-2"
  bind:ref={scrollAreaRef}
>
  <!-- header -->
  <div data-tauri-drag-region class="flex flex-row px-0.5 py-2">
    <Navigator {panel} />
  </div>
  <div class="px-3">
    {#key panel.currentHomeId}
      <TodoView
        {panel}
        homeTask={panel.navTaskList.at(-1)!}
        showTitle={!panel.isRootHome}
        onZoom={(handle) => panel.zoomInto(handle)}
      />
    {/key}
  </div>
</ScrollArea>
