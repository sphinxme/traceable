<script lang="ts">
  /**
   * Weekly — 周日志面板：纵向平铺 15 个周日志（窗口覆盖 6 周前 → 8 周后），
   * 每个 Journal 的容器 Task 是一个独立 home（W3 keyed）。
   *
   * 面板实例由本组件创建；目录/门面注册与滚动记忆接线同 Editor。
   */
  import TodoView from "$lib/components/todolist/TodoView.svelte";
  import dayjs, { type Dayjs } from "dayjs";
  import Focusable from "$lib/components/ui/focusable/Focusable.svelte";
  import type { Store } from "$lib/document/entities/store.svelte";
  import { JournalPanel } from "$lib/view/panel.svelte";
  import { getAppServices } from "$lib/app/context.svelte";
  import { ScrollArea } from "$lib/components/ui/scroll-area";

  interface Props {
    panelId: string;
    store: Store;
  }

  let { panelId, store }: Props = $props();

  const services = getAppServices();

  function genTimes(): Dayjs[] {
    const start = dayjs().startOf("week").add(7, "day");
    return Array.from({ length: 15 }, (_, i) => start.subtract(i - 7, "week"));
  }

  function journals() {
    return genTimes().map((time) =>
      store.getOrCreateJournal(
        `${time.valueOf()}-WEEK`,
        time.valueOf(),
        "WEEK",
        time.format("MM/DD"),
      ),
    );
  }

  const panel = new JournalPanel(
    panelId,
    store,
    services.panelState,
    services.focus,
    journals,
  );

  const entries = $derived.by(() => {
    const byTaskId = new Map(
      journals().map((journal) => [journal.taskId, journal]),
    );
    return panel.homes().map((home) => ({
      home,
      journal: byTaskId.get(home.id)!,
    }));
  });

  const SCROLL_KEY = "__panel__";
  const hadScrollMemory = panel.scrollMemory.has(SCROLL_KEY);

  let scrollAreaRef = $state<HTMLElement | null>(null);

  function isCurrentWeek(time: Dayjs): boolean {
    return time.startOf("week").isSame(dayjs().startOf("week"));
  }

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

    const saved = panel.scrollMemory.get(SCROLL_KEY);
    if (saved) {
      el.scrollTo({
        top: saved.scrollTop,
        left: saved.scrollLeft,
        behavior: "instant",
      });
    }

    const onScroll = () => {
      panel.scrollMemory.set(SCROLL_KEY, {
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
      });
    };
    el.addEventListener("scroll", onScroll);
    return () => {
      panel.scrollMemory.set(SCROLL_KEY, {
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
      });
      el.removeEventListener("scroll", onScroll);
    };
  });
</script>

<div
  class="flex h-full grow flex-col rounded bg-background pl-1 pr-0 shadow-xl"
  style:contain="content"
>
  <ScrollArea bind:ref={scrollAreaRef} class=" h-full pl-2">
    {#each entries as { home, journal } (home.id)}
      <div>
        <Focusable
          focus={!hadScrollMemory && isCurrentWeek(journal.time)}
          inline="start"
        />
        <TodoView
          {panel}
          homeTask={home}
          showTitle
          highlightTitle={isCurrentWeek(journal.time)}
        />
      </div>
    {/each}
  </ScrollArea>
</div>
