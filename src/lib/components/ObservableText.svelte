<script lang="ts">
	import type { Observable } from "rxjs";

	interface Props {
		text: Observable<string>;
		defaultText?: string;
	}

	let { text, defaultText = "未命名" }: Props = $props();
</script>

{$text || defaultText}
