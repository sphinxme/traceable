<script lang="ts">
	// TODO: 支持无限滚动
	import TodoView from "$lib/components/todolist/TodoView.svelte";
	import { Database } from "$lib/states/rxdb";
	import dayjs from "dayjs";
	import { getContext } from "svelte";
	import { range } from "radash";

	const db = getContext<Database>("db");

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
	const a = Promise.all(journalPromiseList).then((value) => {
		console.log({ value });
	});
	console.log({ journalPromiseList });
	const weekEls: Record<string, HTMLDivElement> = $state({});
</script>

<div class=" h-full overflow-y-auto">
	{#each journalPromiseList as promise}
		{#await promise}
			loading
		{:then weekDoc}
			<div bind:this={weekEls[weekDoc.task.id]}>
				{#if isCurrentWeek(weekDoc.time)}
					<div class=" h-0.5 w-full bg-slate-500"></div>
				{/if}
				<TodoView task={weekDoc.task.$} />
			</div>
		{/await}
	{/each}
</div>
