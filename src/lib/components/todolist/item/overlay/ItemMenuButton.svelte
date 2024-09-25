<script lang="ts">
	import { EllipsisVertical } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { createEventDispatcher } from 'svelte';

	const emit = createEventDispatcher();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<EllipsisVertical size={20} />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<DropdownMenu.Group>
			<DropdownMenu.Item
				class="text-red-500"
				on:click={() => {
					emit('delete');
				}}
			>
				删除
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
