<script lang="ts">
	import '../app.css';
	import { db } from '$lib/states/rxdb';
	import Button from '$lib/components/ui/button/button.svelte';
	import { PanelTopClose, SquareLibrary, PanelsTopLeft, CalendarRange } from 'lucide-svelte';
	import { setContext } from 'svelte';
	import { page } from '$app/stores';
	import { Window } from '@tauri-apps/api/window';

	const appWindow = new Window('main');

	// 使用导入的 page store 来获取当前路径
	import { derived } from 'svelte/store';
	import SidebarItem from '$lib/components/sidebar/SidebarItem.svelte';

	// 创建一个派生存储，用于判断某个链接是否应该被激活
	export function isActive(path: string) {
		return derived(page, ($page) => $page.url.pathname === path);
	}

	setContext('db', db);
</script>

<div class=" flex h-full flex-row items-start overflow-hidden rounded-lg bg-slate-100">
	<div data-tauri-drag-region class="flex h-full flex-col">
		<div class="flex flex-row">
			<Button on:click={() => appWindow.close()}>close</Button>
		</div>
		<nav class="flex flex-col">
			<SidebarItem path="/trace" href="/trace"><SquareLibrary /></SidebarItem>
			<SidebarItem path="/organize" href="/organize"><PanelsTopLeft /></SidebarItem>
			<SidebarItem path="/schedule" href="/schedule"><CalendarRange /></SidebarItem>
		</nav>
	</div>
	{#await db.load()}
		<div class=" h-full w-full text-center">loading...</div>
	{:then}
		<slot></slot>
	{/await}
</div>

<style>
</style>
