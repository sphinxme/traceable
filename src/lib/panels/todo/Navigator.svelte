<script lang="ts">
	import { Root, List, Item, Separator, Page, Link } from '$lib/components/ui/breadcrumb';
	import TaskText from './TaskText.svelte';

	export let paths: string[];
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
							<TaskText {taskId} />
						</button>
					</Link>
				</Item>
				<Separator />
			{:else}
				<Item>
					<Page><TaskText {taskId} /></Page>
				</Item>
			{/if}
		{/each}
	</List>
</Root>
