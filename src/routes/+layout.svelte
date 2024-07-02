<script>
	import '../app.css';
	import { db } from '$lib/states/data';
</script>

<div class="flex h-full flex-col items-stretch bg-slate-100">
	<div class="header h-10">header</div>
	{#await db.load()}
		loading...
	{:then}
		<slot></slot>
	{/await}
</div>

<style></style>
