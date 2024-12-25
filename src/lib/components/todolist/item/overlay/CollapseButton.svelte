<script lang="ts">
	import { ChevronDown } from "lucide-svelte";
	interface Props {
		folded?: boolean;
		onfolded: () => void;
		onunfolded: () => void;
	}

	let { folded = $bindable(false), onfolded, onunfolded }: Props = $props();

	const displayClass = (folded: boolean) => {
		if (folded) {
			return "opacity-100";
		}
		return "group-hover:opacity-50 opacity-0";
	};
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
	class={`${displayClass(folded)} cursor-pointer transition-all duration-300 ease-out ${folded ? "-rotate-90" : ""}`}
>
	<ChevronDown size={16} strokeWidth={3} />
</div>
