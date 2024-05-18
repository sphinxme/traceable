<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Calendar from './Calendar.svelte';
	import Editor from './Editor.svelte';
	import { db } from './todo/data';

	// const db = new Database();
	export let rootId = 'root';
</script>

{#await db.load()}
	loading...
{:then ok}
	<div class="flex h-full flex-col bg-slate-100">
		<div class="header h-10 bg-background shadow-xl">header</div>
		<div class="body flex grow flex-row p-4">
			<Resizable.PaneGroup style="overflow:visible;" direction="horizontal">
				<Resizable.Pane style="overflow:visible">
					<div class="h-full pr-2">
						<Calendar {db} {rootId} />
					</div>
				</Resizable.Pane>
				<Resizable.Handle />
				<Resizable.Pane style="overflow:visible;">
					<div class="h-full pl-2">
						<Editor {db} {rootId} />
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</div>
{/await}
