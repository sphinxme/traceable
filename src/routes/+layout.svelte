<script>
	import '../app.css';
	import { db } from '$lib/states/data';
	import Button from '$lib/components/ui/button/button.svelte';
	import { PanelTopClose } from 'lucide-svelte';
</script>

<div class="flex h-full flex-col items-start bg-slate-100">
	<!-- <div class="header z-50 ml-5 h-10 overflow-visible rounded-b-lg bg-white shadow-lg">
		<Tabs.Root value="account">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="account">Account</Tabs.Trigger>
				<Tabs.Trigger value="password">Password</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
	</div> -->
	<div class=" fixed bottom-0 right-8 z-50 m-4 w-4 rounded bg-white shadow-2xl">
		<Button size="icon">
			<PanelTopClose />
		</Button>
	</div>
	{#await db.load()}
		loading...
	{:then}
		<slot></slot>
	{/await}
</div>

<style></style>
