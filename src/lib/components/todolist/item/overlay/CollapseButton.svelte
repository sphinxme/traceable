<script lang="ts">
	import { ChevronDown } from "lucide-svelte";
	interface Props {
		folded?: boolean;
		onfolded: () => void;
		onunfolded: () => void;
	}

	let { folded = $bindable(false), onfolded, onunfolded }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={() => {
		folded = !folded;
		if (folded) {
			onfolded();
		} else {
			onunfolded();
		}
	}}
	class={`${folded ? "opacity-100" : "opacity-50"} transition-opacity duration-300 ease-out hover:opacity-100 ${folded ? "-rotate-90" : ""}`}
>
	<ChevronDown size={16} strokeWidth={3} />
</div>
