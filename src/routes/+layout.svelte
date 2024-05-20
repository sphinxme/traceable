<script>
	import '../app.css';
	import { db } from '$lib/states/data';
</script>

<div class="flex h-full flex-col bg-slate-100">
	<div class="header h-10 bg-background shadow-xl">header</div>
	{#await db.load()}
		loading...
	{:then ok}
		<slot></slot>
	{/await}
</div>

<style></style>
