<script lang="ts">
	// TODO: 支持无限滚动
	import * as Y from "yjs";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import dayjs, { Dayjs } from "dayjs";
	import { getContext, setContext } from "svelte";
	import { range } from "radash";
	import Focusable from "$lib/components/ui/focusable/Focusable.svelte";
	import type { JournalProxyManager } from "$lib/states/meta/journal.svelte";
	import { loadJournalPanelState } from "../todo/state.svelte";
	import type { StateMap } from "$lib/states/states/panel_states";

	let {
		journalProxyManager,
		panelStates,
	}: {
		journalProxyManager: JournalProxyManager;
		panelStates: Y.Map<StateMap>;
	} = $props();

	const panelId = "weekly-"; /* + userId */
	setContext("panelId", panelId);
	const panelState = loadJournalPanelState(panelId, panelStates);

	function isCurrentWeek(t: Dayjs) {
		return t.startOf("week").isSame(dayjs().startOf("week"));
	}

	function genTimes() {
		const start = dayjs().startOf("week").add(7, "day");
		return [...range(-7, 7)].map((offset) =>
			start.subtract(offset, "week"),
		);
	}

	const journalPromiseList = genTimes().map((time) => {
		return journalProxyManager.getOrCreateJournal(
			time,
			"WEEK",
			time.format("MM/DD"),
			`${time.format("YYYY-MM-DD")} - ${time.add(1, "week").format("YYYY-MM-DD")}`,
		);
	});
	const weekEls: Record<string, HTMLDivElement> = $state({});
</script>

<div class="pl-2 h-full overflow-y-auto">
	{#each journalPromiseList as weekDoc}
		<div bind:this={weekEls[weekDoc.task.id]}>
			<Focusable focus={isCurrentWeek(weekDoc.time)} inline="start" />
			<TodoView
				highlightTitle={isCurrentWeek(weekDoc.time)}
				showTitle
				task={weekDoc.task}
				rootItemState={panelState.loadChild(weekDoc.task)}
			/>
		</div>
	{/each}
</div>
