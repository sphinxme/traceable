<script lang="ts">
	import type { Observable } from "rxjs";

	interface Props {
		text: Observable<string> | string;
		defaultText?: string;
	}

	let { text, defaultText = "未命名" }: Props = $props();

	let currentText = $state("");
	let isObservable = typeof text !== "string";

	$effect(() => {
		if (typeof text === "string") {
			currentText = text;
		} else {
			const subscription = text.subscribe((value) => {
				currentText = value;
			});
			return () => subscription.unsubscribe();
		}
	});
</script>

{currentText || defaultText}
