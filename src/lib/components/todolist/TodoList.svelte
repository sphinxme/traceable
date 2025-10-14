<script lang="ts">
	import type { Snippet } from "svelte";

	import Todo from "./Todo.svelte";
	import TaskDropable from "./dnd/TaskDropable.svelte";

	import type { TodoController } from "./controller/TodoController.svelte";
	import { slide } from "svelte/transition";

	interface Props {
		controller: TodoController;
		side?: Snippet;
		alwaysDisplay?: boolean;
	}

	let { controller, side, alwaysDisplay = false }: Props = $props();

	let children = $derived(controller.task.children.$);
	let display = $derived(alwaysDisplay || !controller.statesTree.$folded);
</script>

{#if display}
	<div
		transition:slide
		style:view-transition-name={controller.transitionActions
			.$todoListViewTransitionName}
		class="flex w-full flex-row"
	>
		{@render side?.()}

		{#key $children}
			<div class="relative w-full" role="list">
				{#each $children as child, i (child.id)}
					<div>
						<TaskDropable
							{controller}
							index={i}
							topTaskId={child.id}
							bottomTaskId={$children.get(i - 1)?.id}
						/>

						<Todo parentController={controller} task={child} />
					</div>
				{/each}

				<TaskDropable
					{controller}
					index={$children.size}
					topTaskId={$children.getId($children.size - 1)}
				/>
			</div>
		{/key}
	</div>
{/if}
