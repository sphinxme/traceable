<script lang="ts">
	// TODO: 支持无限滚动
	import TodoView from '$lib/views/TodoView.svelte';
	import { Database, id } from '$lib/states/db';
	import dayjs, { Dayjs } from 'dayjs';
	import { getContext } from 'svelte';

	const db = getContext<Database>('db');
	interface Data {
		id: string;
		taskId: string;
		time: Dayjs;
		textId: string;
	}

	function isCurrentWeek(t: Dayjs) {
		return t.startOf('week').isSame(dayjs().startOf('week'));
	}

	function range(start: number, stop: number, step: number = 1) {
		return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
	}

	function genTimes(): number[] {
		const start = dayjs().startOf('week').add(7, 'day');
		return range(-7, 7).map((offset) => start.subtract(offset, 'week').valueOf());
	}

	function batchGetNewWeekDocs(times: number[]): Promise<Data[]> {
		return new Promise((resolve, reject) => {
			// 先获取
			let got = false;
			let unsubscribe: () => void;
			unsubscribe = db.instant._core.subscribeQuery(
				{
					journalTasks: {
						$: { where: { time: { in: times } } },
						task: {}
					}
				},
				(resp) => {
					if (got) {
						new Promise<void>((resolve) => {
							if (unsubscribe) {
								unsubscribe();
							}
							resolve();
						});
						return;
					}
					got = true;
					if (resp.error) {
						reject(resp.error);
					}
					const result = resp.data?.journalTasks.map((x) => {
						return {
							id: x.id,
							taskId: x.task?.id || '',
							textId: x.task?.textId || '',
							time: dayjs(x.time)
						};
					});
					resolve(result || []);
				}
			);
		});
	}

	async function batchCreateWeekDocs(times: number[]) {
		const result: Data[] = [];
		await db.instant.transact([
			...times.flatMap((t) => {
				const { textId, noteId } = db.newTextAndNote(dayjs(t).format('YYYY-MM-DD'));
				const taskId = id();
				const journalId = id();
				result.push({
					id: journalId,
					taskId: taskId,
					time: dayjs(t),
					textId: textId
				});
				return [
					db.instant.tx.tasks[taskId].update({
						textId: textId,
						noteId: noteId,
						isCompleted: false
					}), // TODO: parent link到有一个weekly的taskId
					db.instant.tx.journalTasks[journalId]
						.update({
							time: t.valueOf(),
							type: 'week'
						})
						.link({ task: taskId })
				];
			})
		]);
		return result;
	}

	async function batchGetOrNewWeekDocs(times: number[]) {
		const docs = await batchGetNewWeekDocs(times);
		const existedTimes = new Set(docs.map((x) => x.time.valueOf()));
		const needToCreateTimes = times.filter((t) => !existedTimes.has(t));
		const created = await batchCreateWeekDocs(needToCreateTimes);
		return [...docs, ...created].sort((a, b) => b.time.valueOf() - a.time.valueOf());
	}

	const docsPromise = batchGetOrNewWeekDocs(genTimes());
	const weekEls: Record<string, HTMLDivElement> = {};
</script>

<div class=" h-full overflow-y-auto">
	{#await docsPromise then weekDocs}
		{#each weekDocs as weekDoc (weekDoc.taskId)}
			<div bind:this={weekEls[weekDoc.taskId]}>
				{#if isCurrentWeek(weekDoc.time)}
					<div class=" h-0.5 w-full bg-slate-500"></div>
				{/if}
				<TodoView rootId={weekDoc.taskId} />
			</div>
		{/each}
	{/await}
</div>
