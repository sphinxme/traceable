<script lang="ts">
	import { quill } from '$lib/components/quill/quill';
	import * as Y from 'yjs';

	export let text: Y.Text;
</script>

<div use:quill={{ text }} />
