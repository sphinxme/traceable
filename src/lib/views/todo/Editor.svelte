<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Skull, BatteryFull } from 'lucide-svelte';
	import TodoList from '$lib/components/todolist/TodoList.svelte';
	import { Database } from '$lib/states/data';
	import { onMount } from 'svelte';
	import { ThirdPartyDraggable } from '@fullcalendar/interaction/index.js';

	export let db: Database;
	export let rootId = 'root';
	const text = db.getTaskText(rootId);
	let rootTaskChildren = db.getTaskChildren(rootId);

	let listContainer: HTMLDivElement;

	onMount(() => {
		const draggable = new ThirdPartyDraggable(listContainer, {
			itemSelector: 'div .handle',
			mirrorSelector: '.sortable-ghost'
		});
	});
</script>

<div class="flex h-full flex-col rounded bg-background p-4 shadow-xl">
	<!-- header -->
	<div class="flex flex-row">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/components">Components</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>Breadcrumb</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<div class="flex flex-grow items-center justify-center">---</div>
		<div class="flex flex-row">
			<BatteryFull />
			<Skull />
		</div>
	</div>

	<!-- main -->
	<div class="flex h-full flex-col p-4">
		<h1 class="scroll-m-20 py-4 text-3xl font-bold tracking-tight transition-colors first:mt-0">
			{text.toJSON()}
		</h1>

		<div class="pl-6" bind:this={listContainer}>
			<TodoList {db} parentTaskId={rootId} items={rootTaskChildren} />
		</div>
	</div>
</div>
