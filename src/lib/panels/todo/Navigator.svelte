<script lang="ts">
	import {
		Root,
		List,
		Item,
		Separator,
		Page,
		Link,
	} from "$lib/components/ui/breadcrumb";
	import TaskText from "./TaskText.svelte";
	import type { PathItem } from "$lib/states/stores.svelte";

	interface Props {
		paths: PathItem[];
	}

	let { paths = $bindable() }: Props = $props();
</script>

<Root>
	<List>
		{#each paths as item, i}
			{#if i + 1 < paths.length}
				<Item>
					<Link href="lang">
						{#snippet child(attrs)}
							<button
								{...attrs}
								onclick={() => {
									paths = paths.slice(0, i + 1);
								}}
							>
								<TaskText task={item.proxy} />
							</button>
						{/snippet}
					</Link>
				</Item>
				<Separator />
			{:else}
				<Item>
					<Page><TaskText task={item.proxy} /></Page>
				</Item>
			{/if}
		{/each}
	</List>
</Root>
