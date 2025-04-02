<script lang="ts">
	import {
		Root,
		List,
		Item,
		Separator,
		Page,
		Link,
	} from "$lib/components/ui/breadcrumb";
	import type { EditorPanelState } from "$lib/states/states/panel_states";
	import { fade, fly } from "svelte/transition";
	import Text from "../../components/ObservableText.svelte";
	import { House } from "lucide-svelte";
	import { setTransitioningPaths } from "$lib/states/stores.svelte";
	import { tick } from "svelte";

	interface Props {
		panelState: EditorPanelState;
		onPopPaths: () => () => void;
	}

	let { panelState: editorState, onPopPaths }: Props = $props();
	let paths = editorState.path$;

	const pop = async (i: number) => {
		const currentPaths = [...$paths];
		const onPopedPaths = onPopPaths();
		await tick();
		document
			.startViewTransition(() => {
				setTransitioningPaths(currentPaths);
				editorState.pop(i + 1);
				onPopedPaths();
				return tick();
			})
			.finished.then(() => {
				setTransitioningPaths([]);
			});
	};
</script>

<Root>
	<List>
		{#each $paths as task, i (task.id)}
			<Item index={i}>
				{#if i === 0}
					<Link href="lang">
						{#snippet child(attrs)}
							<button {...attrs} onclick={() => pop(i)}>
								<House class="my-1" size={16} />
							</button>
						{/snippet}
					</Link>
				{:else if i + 1 < $paths.length}
					<Link href="lang">
						{#snippet child(attrs)}
							<button {...attrs} onclick={() => pop(i)}>
								<Text text={task.text$} />
							</button>
						{/snippet}
					</Link>
				{:else}
					<Page>
						<Text text={task.text$} />
					</Page>
				{/if}
			</Item>
			{#if i === 0}
				<Separator
					index={i}
					class={$paths.length === 1
						? "-rotate-45 transition-transform"
						: "transition-transform"}
				/>
			{:else if i + 1 < $paths.length}
				<Separator index={i} />
			{/if}
		{/each}
	</List>
</Root>
