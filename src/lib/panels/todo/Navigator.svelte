<script lang="ts">
	import { Root, List, Item, Separator, Page, Link } from '$lib/components/ui/breadcrumb';
	import type { Database } from '$lib/states/data';
	import TaskText from './TaskText.svelte';

	export let paths: string[];
	export let db: Database;
</script>

<Root>
	<List>
		{#each paths as taskId, i (taskId)}
			{#if i + 1 < paths.length}
				<Item>
					<Link asChild href="lang" let:attrs>
						<button
							{...attrs}
							on:click={() => {
								paths = paths.slice(0, i + 1);
							}}
						>
							<TaskText {db} {taskId} />
						</button>
					</Link>
				</Item>
				<Separator />
			{:else}
				<Item>
					<Page><TaskText {db} {taskId} /></Page>
				</Item>
			{/if}
		{/each}
	</List>
</Root>
