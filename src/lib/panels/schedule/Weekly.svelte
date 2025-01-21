<script lang="ts">
	// TODO: 支持无限滚动
	import * as Y from "yjs";
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import { Database } from "$lib/states/rxdb";
	import dayjs from "dayjs";
	import { getContext, setContext } from "svelte";
	import { range } from "radash";
	import type { StateMap } from "$lib/states/rxdb/rxdb";
	import Focusable from "$lib/components/ui/focusable/Focusable.svelte";

	const db = getContext<Database>("db");
	const panelId = "weekly-"; /* + userId */
	setContext("panelId", panelId);

	// svelte-ignore non_reactive_update
	let panelState = db.panelStates.get(panelId)!;
	if (!panelState) {
		panelState = new Y.Map();
		db.panelStates.set(panelId, panelState);
	}

	function getOrNewState(id: string) {
		let state = panelState.get(id) as StateMap | undefined;
		if (!state) {
			state = new Y.Map();
			panelState.set(id, state);
		}
		return state;
	}

	function isCurrentWeek(t: number) {
		return dayjs(t).startOf("week").isSame(dayjs().startOf("week"));
	}

	function genTimes() {
		const start = dayjs().startOf("week").add(7, "day");
		return [...range(-7, 7)].map((offset) =>
			start.subtract(offset, "week"),
		);
	}

	const journalPromiseList = genTimes().map((time) =>
		db.journals.getOrCreateJounral(
			time.valueOf(),
			"week",
			time.format("MM/DD"),
			`${time.format("YYYY-MM-DD")} - ${time.add(1, "week").format("YYYY-MM-DD")}`,
		),
	);
	const weekEls: Record<string, HTMLDivElement> = $state({});
</script>

<div class="pl-2 h-full overflow-y-auto">
	{#each journalPromiseList as promise}
		{#await promise}
			loading
		{:then weekDoc}
			<div bind:this={weekEls[weekDoc.task.id]}>
				<Focusable focus={isCurrentWeek(weekDoc.time)} inline="start" />
				<TodoView
					highlightTitle={isCurrentWeek(weekDoc.time)}
					showTitle
					task={weekDoc.task.$}
					stateMap={getOrNewState(weekDoc.task.id)}
				/>
			</div>
		{/await}
	{/each}
</div>
