<script lang="ts">
	// TODO: 支持无限滚动
	import * as Y from "yjs";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import dayjs, { Dayjs } from "dayjs";
	import Focusable from "$lib/components/ui/focusable/Focusable.svelte";
	import { JournalProxyManager } from "$lib/states/meta/journal.svelte";
	import type { StateMap } from "$lib/states/states/panel_states";
	import { PanelStateStore } from "$lib/states/states/StatesTree.svelte";
	import { JournalPanelController } from "$lib/components/todolist/controller/PanelController.svelte";

	interface Props {
		journalProxyManager: JournalProxyManager;
		allPanelStates: Y.Map<StateMap>;
		panelId: string;
	}

	let { journalProxyManager, allPanelStates, panelId }: Props = $props();
	const rootTaskId = "none";

	const panelState = PanelStateStore.getOrCreateFromParentYMap(
		allPanelStates,
		panelId,
		rootTaskId,
	);

	const controller = new JournalPanelController(
		panelId,
		panelState,
		rootTaskId,
		journalProxyManager,
	);

	function isCurrentWeek(t: Dayjs) {
		return t.startOf("week").isSame(dayjs().startOf("week"));
	}
	// TODO:focus改成使用mitt + viewId触发
</script>

<div class="pl-2 h-full overflow-y-auto">
	{#each controller.getJournalList() as weekDoc}
		<div>
			<Focusable focus={isCurrentWeek(weekDoc.time)} inline="start" />
			<TodoView
				showTitle
				highlightTitle={isCurrentWeek(weekDoc.time)}
				controller={controller.getTodoController(weekDoc)}
			/>
		</div>
	{/each}
</div>
