<script lang="ts">
	import {
		currentWeekDocId,
		dateFromWeekDocId,
		nextWeekId,
		preWeekId
	} from '$lib/components/time/id';
	import TodoView from '$lib/views/TodoView.svelte';
	import { db } from '$lib/states/data';
	import { onMount, setContext, tick } from 'svelte';

	let currentWeek = currentWeekDocId();
	let currentMinWeek = preWeekId(currentWeek); // 不存在
	let currentMaxWeek = nextWeekId(currentWeek); // 不存在
	const batch = 5;

	let weekDocuments: string[] = [];
	let weekEls: Record<string, HTMLDivElement> = {};
	let container: HTMLDivElement;
	let updating = false;

	const panelId = 'weekly';
	setContext('panelId', panelId);

	const fetch = (weekId: string) => {
		db.getOrCreateOrganzieTask(weekId, dateFromWeekDocId(weekId)?.format('YYYY-MM-DD') || 'none');
		return weekId;
	};

	const loadMoreBottom = async (count: number, max: number = 10) => {
		if (updating) {
			return;
		}

		updating = true;
		while (max && requireBottom()) {
			console.log('bottom', max);
			max--;
			for (let i = 0; i < count; i++) {
				const weekId = fetch(currentMinWeek);
				// weekDocuments = [...weekDocuments, weekId];
				weekDocuments.push(weekId);
				currentMinWeek = preWeekId(currentMinWeek);
			}
			weekDocuments = weekDocuments;
			await tick();
		}
		updating = false;
	};

	const loadMoreTop = async (count: number, max: number = 10) => {
		if (updating) {
			return;
		}

		updating = true;
		while (max && requireTop()) {
			console.log('top', max);
			max--;
			for (let i = 0; i < count; i++) {
				const weekId = fetch(currentMaxWeek);
				weekDocuments.unshift(weekId);
				currentMaxWeek = nextWeekId(currentMaxWeek);
			}
			weekDocuments = weekDocuments;
			await tick();
		}
		updating = false;
	};

	const requireBottom = (): boolean => {
		let scrollTop = container.scrollTop;
		let scrollBottom = container.scrollHeight - container.clientHeight - scrollTop;

		return scrollBottom < 20;
	};

	const requireTop = (): boolean => {
		return container.scrollTop < 200;
	};

	const load = async () => {
		await loadMoreBottom(batch);
		await loadMoreTop(batch);
	};
	onMount(async () => {
		weekDocuments.push(fetch(currentWeek));
		await loadMoreBottom(batch);
		await loadMoreTop(batch, 1);
		weekDocuments = weekDocuments;
		await tick();

		container.scrollTop = weekEls[currentWeek].offsetTop;
	});
</script>

<div
	bind:this={container}
	on:scroll={() => {
		load();
	}}
	class=" h-full overflow-y-auto"
>
	{#each weekDocuments as docId (docId)}
		<div bind:this={weekEls[docId]}>
			{#if docId == currentWeek}
				<div class=" h-0.5 w-full bg-slate-500"></div>
			{/if}
			<TodoView {db} rootId={docId} />
		</div>
	{/each}
</div>
