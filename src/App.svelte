<svelte:options runes={true} />

<script lang="ts">
	// import Button from "$lib/components/ui/button/button.svelte";
	// import { SquareLibrary, PanelsTopLeft, CalendarRange } from "lucide-svelte";
	import { onDestroy, setContext } from "svelte";

	import Router from "svelte-spa-router";
	import { Window } from "@tauri-apps/api/window";

	import Calculator from "lucide-svelte/icons/calculator";
	import Calendar from "lucide-svelte/icons/calendar";
	import CreditCard from "lucide-svelte/icons/credit-card";
	import Smile from "lucide-svelte/icons/smile";
	import User from "lucide-svelte/icons/user";
	import * as Command from "$lib/components/ui/command/index.js";

	// 使用导入的 page store 来获取当前路径
	// import SidebarItem from "$lib/components/sidebar/SidebarItem.svelte";
	import DefaultPage from "./routes/DefaultPage.svelte";
	import TracePage from "./routes/TracePage.svelte";
	import OrganizePage from "./routes/OrganizePage.svelte";
	import SchedulePage from "./routes/SchedulePage.svelte";
	import {
		CalendarRange,
		PanelsTopLeft,
		Settings,
		SquareLibrary,
	} from "lucide-svelte";
	import SidebarItem from "$lib/components/sidebar/SidebarItem.svelte";
	import hotkeys from "hotkeys-js";
	import SettingsPage from "./routes/SettingsPage.svelte";
	import {
		loadFromIndexedDB,
		loadFromLiveBlocks,
		newYDoc,
	} from "$lib/states/yjs/load";
	import { load } from "./state";
	import Loading from "$lib/components/loading/Loading.svelte";

	const appWindow = new Window("main");
	let open = $state(false); // open dialog
	const doc = newYDoc();
	const loadingFromIndexedDBPromise = loadFromIndexedDB(doc);
	// const loadingFromLiveBlocksPromise = loadFromLiveBlocks(doc);
	const loadingFromLiveBlocksPromise = new Promise<void>((resolve) =>
		resolve(),
	);
	const loadPromise = Promise.all([
		loadingFromIndexedDBPromise,
		loadingFromLiveBlocksPromise,
	]);
	const finalLoad = loadPromise.then(() => {
		load(doc);
	});

	const routes = {
		"/": DefaultPage,
		"/trace": TracePage,
		"/organize": OrganizePage,
		"/schedule": SchedulePage,
		"/settings": SettingsPage,
	};

	hotkeys("command+p,alt+p", (e) => {
		if (e.type === "keydown") {
			e.preventDefault();
			open = !open;

			return false;
		}
	});

	onDestroy(() => {
		hotkeys.unbind();
	});
</script>

<Command.Dialog bind:open>
	<Command.Input placeholder="Type a command or search..." />
	<Command.List>
		<Command.Empty>No results found.</Command.Empty>
		<Command.Group heading="Suggestions">
			<Command.Item>
				<Calendar class="mr-2 size-4" />
				<span>Calendar</span>
			</Command.Item>
			<Command.Item>
				<Smile class="mr-2 size-4" />
				<span>Search Emoji</span>
			</Command.Item>
			<Command.Item>
				<Calculator class="mr-2 size-4" />
				<span>Calculator</span>
			</Command.Item>
		</Command.Group>
		<Command.Separator />
		<Command.Group heading="Settings">
			<Command.Item>
				<User class="mr-2 size-4" />
				<span>Profile</span>
				<Command.Shortcut>⌘P</Command.Shortcut>
			</Command.Item>
			<Command.Item>
				<CreditCard class="mr-2 size-4" />
				<span>Billing</span>
				<Command.Shortcut>⌘B</Command.Shortcut>
			</Command.Item>
			<Command.Item>
				<Settings class="mr-2 size-4" />
				<span>Settings</span>
				<Command.Shortcut>⌘S</Command.Shortcut>
			</Command.Item>
		</Command.Group>
	</Command.List>
</Command.Dialog>
{#await finalLoad}
	<Loading
		items={{
			indexedDB: loadingFromIndexedDBPromise,
			liveblocks: loadingFromLiveBlocksPromise,
		}}
	/>
{:then}
	<div class=" flex h-full flex-col items-start overflow-hidden bg-zinc-100">
		<div
			data-tauri-drag-region
			style="transition-property: margin-bottom"
			class=" justify-center ease-in-out duration-300 transition -mb-8 hover:mb-0 w-full flex flex-row bg-zinc-100"
		>
			<nav class="flex flex-row">
				<SidebarItem path="/trace">
					<SquareLibrary />
				</SidebarItem>
				<SidebarItem path="/organize">
					<PanelsTopLeft />
				</SidebarItem>
				<SidebarItem path="/schedule">
					<CalendarRange />
				</SidebarItem>

				<SidebarItem path="/settings">
					<Settings />
				</SidebarItem>
			</nav>
		</div>

		<!-- <DefaultPage /> -->
		<Router {routes} />
	</div>
{/await}

<style>
</style>
