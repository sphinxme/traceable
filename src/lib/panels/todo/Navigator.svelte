<script lang="ts">
	import { Root, List, Item, Separator, Page, Link } from '$lib/components/ui/breadcrumb';
	import type { TaskProxy } from '$lib/states/rxdb';
	import type { Observable } from 'rxjs';
	import TaskText from './TaskText.svelte';

	interface Props {
		paths: Observable<TaskProxy>[];
	}

	let { paths = $bindable() }: Props = $props();
</script>

<Root>
	<List>
		{#each paths as task, i}
			{#if i + 1 < paths.length}
				<Item>
					<Link href="lang" >
						{#snippet child(attrs)}
							<button
								{...attrs}
								onclick={() => {paths = paths.slice(0, i + 1)}}
							>
								<TaskText {task} />
							</button>
						{/snippet}
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
