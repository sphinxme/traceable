<svelte:options runes={true} />

<script lang="ts">
  import DefaultPage from "./routes/DefaultPage.svelte";
  import TracePage from "./routes/TracePage.svelte";
  import OrganizePage from "./routes/OrganizePage.svelte";
  import SchedulePage from "./routes/SchedulePage.svelte";
  import SettingsPage from "./routes/SettingsPage.svelte";

  import { PlusIcon } from "@lucide/svelte";
  import {
    loadFromIndexedDB,
    loadFromLiveBlocks,
    newYDoc,
  } from "$lib/states/yjs/load";
  import { Database } from "$lib/document/entities/database.svelte";
  import AppProvider from "$lib/app/AppProvider.svelte";
  import Router from "$lib/router/Router.svelte";
  import NavBarItem from "$lib/components/navbar/NavBarItem.svelte";
  import Loading from "$lib/components/loading/Loading.svelte";

  const doc = newYDoc();
  const loadingFromIndexedDBPromise = loadFromIndexedDB(doc);
  const loadingFromLiveBlocksPromise = loadFromLiveBlocks(doc);
  const loadPromise = Promise.all([
    loadingFromIndexedDBPromise,
    loadingFromLiveBlocksPromise,
  ]);
  const finalLoad = loadPromise.then(() => new Database(doc));

  const routes = {
    "/": DefaultPage,
    "/trace": TracePage,
    "/organize": OrganizePage,
    "/schedule": SchedulePage,
    "/settings": SettingsPage,
  };
</script>

<!-- <Command.Dialog bind:open>
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
</Command.Dialog> -->
{#await finalLoad}
  <Loading
    items={{
      indexedDB: loadingFromIndexedDBPromise,
      liveblocks: loadingFromLiveBlocksPromise,
    }}
  />
{:then database}
  <AppProvider db={database}>
    <div
      data-tauri-drag-region
      class=" flex h-full flex-col items-start overflow-hidden bg-zinc-100"
    >
      <div
        data-tauri-drag-region
        class=" flex h-9 w-full flex-row items-center justify-center gap-2 px-1.5 duration-300 ease-in-out"
      >
        <div data-tauri-drag-region class="flex-1"></div>
        <NavBarItem></NavBarItem>

        <div data-tauri-drag-region class="flex-1">
          <PlusIcon class="ml-auto text-zinc-600" size={18} />
        </div>
      </div>

      <!-- <DefaultPage /> -->
      <Router {routes}></Router>

      <!-- <Router {routes} /> -->
    </div>
  </AppProvider>
{/await}
