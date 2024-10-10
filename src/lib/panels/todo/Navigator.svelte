<script lang="ts">
	import { Root, List, Item, Separator, Page, Link } from '$lib/components/ui/breadcrumb';
	import type { TaskProxy } from '$lib/states/rxdb';
	import type { Observable } from 'rxjs';
	import TaskText from './TaskText.svelte';

	export let paths: Observable<TaskProxy>[];
</script>

<Root>
	<List>
		{#each paths as task, i}
			{#if i + 1 < paths.length}
				<Item>
					<Link asChild href="lang" let:attrs>
						<button
							{...attrs}
							on:click={() => {
								paths = paths.slice(0, i + 1);
							}}
						>
							<TaskText {task} />
						</button>
					</Link>
				</Item>
				<Separator />
			{:else}
				<Item>
					<Page><TaskText {task} /></Page>
				</Item>
			{/if}
		{/each}
	</List>
</Root>
