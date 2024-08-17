<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Skull, BatteryFull } from 'lucide-svelte';
	import { Database } from '$lib/states/data';
	import TodoPanel from '$lib/views/TodoView.svelte';
	import { setContext } from 'svelte';

	export let db: Database;
	export let rootId = 'root';

	setContext('panelId', 'root');
</script>

<div class="flex h-full grow flex-col overflow-auto rounded bg-background p-4 shadow-xl">
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

	<TodoPanel {db} {rootId} />
</div>
