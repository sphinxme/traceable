<script lang="ts">
	import { quill } from "$lib/components/quill/quill";
	import * as Y from "yjs";

	interface Props {
		text: Y.Text;
	}

	let { text }: Props = $props();
</script>

<div use:quill={{ text }}></div>
