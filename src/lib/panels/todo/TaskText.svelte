<script lang="ts">
	import type { Observable } from "rxjs";
	import { type TaskProxy } from "$lib/states/rxdb";

	interface Props {
		task: Observable<TaskProxy>;
	}

	let { task }: Props = $props();
	let text = $task.text();
</script>

{$text || "未命名"}
