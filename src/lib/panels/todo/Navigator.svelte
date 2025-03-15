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
	import Text from "../../components/ObservableText.svelte";
	import { House } from "lucide-svelte";

	interface Props {
		panelState: EditorPanelState;
	}

	let { panelState: editorState }: Props = $props();
	let paths = editorState.path$;
</script>

<Root>
	<List>
		{#each $paths as task, i}
			{#if i === 0}
				<Item
					><Link href="lang">
						{#snippet child(attrs)}
							<button
								{...attrs}
								onclick={() => {
									editorState.pop(i + 1);
								}}
							>
								<House class="my-1" size={16} />
							</button>
						{/snippet}
					</Link>
				</Item>
				<Separator
					class={$paths.length === 1
						? "-rotate-45 transition-transform"
						: "transition-transform"}
				/>
			{:else if i + 1 < $paths.length}
				<Item>
					<Link href="lang">
						{#snippet child(attrs)}
							<button
								{...attrs}
								onclick={() => {
									editorState.pop(i + 1);
								}}
							>
								<Text text={task.text$} />
							</button>
						{/snippet}
					</Link>
				</Item>
				<Separator />
			{:else}
				<Item>
					<Page><Text text={task.text$} /></Page>
				</Item>
			{/if}
		{/each}
	</List>
</Root>
