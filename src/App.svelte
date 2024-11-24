<script lang="ts">
	// import Button from "$lib/components/ui/button/button.svelte";
	// import { SquareLibrary, PanelsTopLeft, CalendarRange } from "lucide-svelte";
	import { setContext } from "svelte";

	import Router from "svelte-spa-router";
	import { Window } from "@tauri-apps/api/window";

	// 使用导入的 page store 来获取当前路径
	// import SidebarItem from "$lib/components/sidebar/SidebarItem.svelte";
	import DefaultPage from "./routes/DefaultPage.svelte";
	import { db } from "$lib/states/rxdb";
	import TracePage from "./routes/TracePage.svelte";
	import OrganizePage from "./routes/OrganizePage.svelte";
	import SchedulePage from "./routes/SchedulePage.svelte";
	import { CalendarRange, PanelsTopLeft, SquareLibrary } from "lucide-svelte";
	import SidebarItem from "$lib/components/sidebar/SidebarItem.svelte";

	setContext("db", db);
	const appWindow = new Window("main");

	const routes = {
		"/": DefaultPage,
		"/trace": TracePage,
		"/organize": OrganizePage,
		"/schedule": SchedulePage,
	};
</script>

<div class=" flex h-full flex-row items-start overflow-hidden">
	<div
		data-tauri-drag-region
		class="flex h-full flex-col bg-slate-100 rounded-lg"
	>
		<nav class="flex flex-col">
			<SidebarItem path="/trace">
				<SquareLibrary />
			</SidebarItem>
			<SidebarItem path="/organize">
				<PanelsTopLeft />
			</SidebarItem>
			<SidebarItem path="/schedule">
				<CalendarRange />
			</SidebarItem>
		</nav>
	</div>
	{#await db.load()}
		<div class=" h-full w-full text-center">loading...</div>
	{:then}
		<!-- <DefaultPage /> -->
		<Router {routes} />
	{/await}
</div>

<style>
</style>
