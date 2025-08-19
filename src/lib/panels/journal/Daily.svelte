<script lang="ts">
    // TODO: 支持无限滚动
    import * as Y from "yjs";
    import TodoView from "$lib/components/todolist/TodoView.svelte";
    import dayjs, { Dayjs } from "dayjs";
    import Focusable from "$lib/components/ui/focusable/Focusable.svelte";
    import { JournalProxyManager } from "$lib/states/meta/journal.svelte";
    import type { StateMap } from "$lib/states/states/panel_states";
    import { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
    import { DailyJournalPanelController } from "./JournalPanelController.svelte";

    interface Props {
        journalProxyManager: JournalProxyManager;
        allPanelStates: Y.Map<StateMap>;
        panelId: string;
    }

    let { journalProxyManager, allPanelStates, panelId }: Props = $props();
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
        journalProxyManager,
    );

    function isCurrentDay(t: Dayjs) {
        return t.startOf("day").isSame(dayjs().startOf("day"));
    }
    // TODO:focus改成使用mitt + viewId触发
</script>

<div
    class="flex h-full grow flex-col rounded bg-background pr-0 shadow-xl pl-1"
>
    <div class="pl-2 h-full overflow-y-auto">
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
