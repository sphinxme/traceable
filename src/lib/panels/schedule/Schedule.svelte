<script lang="ts">
	import * as Y from "yjs";
	import type { JournalProxyManager } from "$lib/states/meta/journal.svelte";

	import Weekly from "./Weekly.svelte";

	let {
		journalProxyManager,
		panelStateMap,
	}: {
		journalProxyManager: JournalProxyManager;
		panelStateMap: Y.Map<any>;
	} = $props();
</script>

<div
	class="flex h-full grow flex-col rounded bg-background pr-0 shadow-xl pl-1"
>
	<Weekly {journalProxyManager} panelStates={panelStateMap}></Weekly>
</div>
