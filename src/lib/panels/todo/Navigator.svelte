<script lang="ts">
	import {
		Root,
		List,
		Item,
		Separator,
		Page,
		Link,
	} from "$lib/components/ui/breadcrumb";
	import Text from "../../components/ObservableText.svelte";
	import { House } from "lucide-svelte";
	import type { EditorPanelController } from "$lib/components/todolist/controller/PanelController.svelte";

	interface Props {
		controller: EditorPanelController;
	}

	let { controller }: Props = $props();
</script>

<Root>
	<List>
		{#each controller.$currentPaths as task, i (task.id)}
			<Item index={i}>
				{#if i === 0}
					<Link href="lang">
						{#snippet child(attrs)}
							<button
								{...attrs}
								onclick={() => controller.popTo(i)}
							>
								<House class="my-1" size={18} />
							</button>
						{/snippet}
					</Link>
				{:else if i + 1 < controller.$currentPaths.length}
					<Link href="lang">
						{#snippet child(attrs)}
							<button
								{...attrs}
								onclick={() => controller.popTo(i)}
							>
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
					class={controller.$isRootHome
						? "-rotate-45 transition-transform"
						: "transition-transform"}
				/>
			{:else if i + 1 < controller.$currentPaths.length}
				<Separator index={i} />
			{/if}
		{/each}
	</List>
</Root>
