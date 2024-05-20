<svelte:options
	customElement={{
		tag: 'event-title',
		shadow: 'none'
	}}
/>

<script lang="ts">
	import { db } from '$lib/states/data';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import { createEventDispatcher, onMount } from 'svelte';
	import type { YTextEvent } from 'yjs';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { highlightFEventIds } from '$lib/states/stores';

	export let taskId: string;
	export let eventId: string;
	const onTextChange = (event: YTextEvent) => {
		text = event.target.toJSON();
	};
	const yText = db.getTaskText(taskId);
	let text: string = yText.toJSON();
	let highlight = highlightFEventIds.has(eventId);
	onMount(() => {
		yText.observe(onTextChange);
		const unsubscribe = highlightFEventIds.subscribe((set) => {
			highlight = set.has(eventId);
		});
		return async () => {
			yText.unobserve(onTextChange);
			unsubscribe();
		};
	});

	const emit = createEventDispatcher();
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger class="block h-full">
		<HoverCard.Root>
			<HoverCard.Trigger
				class={`block h-full transition-colors duration-100 ${highlight ? ' bg-white' : ''}`}
				>{text}</HoverCard.Trigger
			>
			<HoverCard.Content side="top">
				<button
					on:click={() => {
						console.log('emiting');
						emit('custom', 'ok');
					}}>kkkkk</button
				>
			</HoverCard.Content>
		</HoverCard.Root>
	</ContextMenu.Trigger>
	<ContextMenu.Content>
		<ContextMenu.Item>Profile</ContextMenu.Item>
		<ContextMenu.Item>Billing</ContextMenu.Item>
		<ContextMenu.Item>Team</ContextMenu.Item>
		<ContextMenu.Item>Subscription</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
