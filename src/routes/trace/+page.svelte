<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable';
	import Calendar from '$lib/views/calendar/Calendar.svelte';
	import Editor from '$lib/views/todo/Editor.svelte';
	import { db } from '$lib/states/data';

	export let rootId = 'root';
</script>

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
