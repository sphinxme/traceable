---
description: describe the Tech Stack And Integration
globs: 
alwaysApply: false
---
# Cursor Rule: Traceable App - Overview & Tech Stack

## 1. Application Overview

*   **Type**: Desktop agenda management app (Tauri + Svelte).
*   **Core Philosophy**: "事事可追溯" (Everything is traceable).
*   **Main Features**:
    1.  **Todolist View**: Infinitely nested outliner (`TaskProxy`) with bidirectional links. UI: `src/lib/components/todolist/`. Data: `src/lib/states/meta/task.svelte.ts`.
    2.  **Scheduling View**: Visual calendar (`EventProxy`) for task time blocking. UI: `src/lib/components/calendar/`. Data: `src/lib/states/meta/event.svelte.ts`.

## 2. Core Value: "Traceable" Implementation

*   **Infinite Nesting**: `TaskProxy.children` (`Y.Array<string>`) recursively rendered by `TodoList.svelte`.
*   **Bidirectional Linking**: `TaskProxy` has `children` and `parents` (`Y.Array<string>`). `TaskProxy.attachChild()` updates both.
*   **Task-Event Linking**: `TaskProxy.events` (`Y.Array<string>`) links to `EventProxy.id`. `EventProxy.taskId` links back to `TaskProxy`.
*   **Data Orchestration**: `Database` class (`src/lib/states/meta/database.svelte.ts`) manages all data models and their Yjs representations.

## 3. Technology Stack

| Category             | Technology                                   | Key Files / Config                                                                                                   |
| :------------------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| Desktop Framework    | **Tauri 2**                                  | `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`                                         |
| UI Framework         | **Svelte 5**                                 | `package.json#dependencies.svelte`, `svelte.config.js`, `vite.config.ts` (`@sveltejs/vite-plugin-svelte`)             |
| CSS Solution         | **Tailwind CSS + shadcn-svelte**             | `tailwind.config.ts`, `src/app.css`, `components.json`                                                               |
| Data Layer Core      | **Yjs**                                      | `package.json#dependencies.yjs`                                                                                      |
| Data Persistence     | **IndexedDB** (`y-indexeddb`)                | `package.json#dependencies.y-indexeddb`                                                                              |
| Data Synchronization | **Liveblocks** (`@liveblocks/yjs`)           | `package.json#dependencies["@liveblocks/yjs"]`, `.env.development#VITE_LIVEBLOCKS_AUTH_ENDPOINT`                      |
| Build Tool           | **Vite**                                     | `vite.config.ts`                                                                                                     |
| Dev Tasks            | **Deno**                                     | `deno.json`, `tauri.conf.json#build.beforeDevCommand`                                                                |

## 4. Key Libraries & Roles

### 4.1. Tauri

*   **Purpose**: Builds the desktop application shell.
*   **Config**: `src-tauri/tauri.conf.json` (app metadata, build commands, permissions via `capabilities/default.json`).
*   **Backend**: `src-tauri/src/lib.rs` (Rust app setup, `WebviewWindowBuilder` for main window).
*   **Frontend API**: `@tauri-apps/api/window` (`new Window("main")` in `src/App.svelte`), `data-tauri-drag-region`.

### 4.2. Svelte 5

*   **Purpose**: Reactive UI framework.
*   **Organization**: Components in `src/lib/components/`, `src/lib/panels/`. Routes: `src/routes/`. Shell: `src/App.svelte`.
*   **State Management**:
    *   Runes: `$state`, `$derived` (e.g., `src/lib/states/stores.svelte.ts`, `WeekEvent.svelte`).
    *   Context API: `getContext`, `setContext` (e.g., `src/lib/panels/todo/context.svelte.ts`).
*   **Compilation**: `svelte.config.js` (`vitePreprocess`), `vite.config.ts` (`@sveltejs/vite-plugin-svelte`).

### 4.3. Tailwind CSS / shadcn-svelte

*   **Purpose**: Styling and pre-built UI components.
*   **Config**: `tailwind.config.ts` (theme, plugins). Global CSS: `src/app.css`.
*   **Shadcn-svelte**: `components.json` (UI component path aliases). Usage: `import * as Dialog from "$lib/components/ui/dialog/"`.
*   **Utils**: `cn()` in `src/lib/utils.ts` for class merging.

### 4.4. Yjs

*   **Purpose**: Collaborative data structures (CRDTs).
*   **Initialization**: `Y.Doc` created in `src/lib/states/yjs/load.ts` -> `newYDoc()`, managed by `Database` in `src/state.ts`.
*   **Core Yjs Types Used**:
    *   `Y.Map`: Base for `TaskProxy`, `EventProxy`, `JournalProxy`, `panelStates`, `user` data in `src/lib/states/yjs/repository.ts` (e.g., `doc.getMap("tasks")`).
    *   `Y.Array`: For `TaskProxy.children`, `TaskProxy.parents`, `TaskProxy.events`.
    *   `Y.Text`: For `TaskProxy.text`, `TaskProxy.note` (via `textId`, `noteId`). Integrated with `y-quill` (`src/lib/components/quill/quill.ts`).
*   **Transactions**: `doc.transact(...)` for atomic operations (e.g., `Database.import()`).

### 4.5. IndexedDB (Adapter: `y-indexeddb`)

*   **Purpose**: Local-first persistence of Yjs data.
*   **Integration**: `src/lib/states/yjs/load.ts` -> `loadFromIndexedDB()`.
*   **Usage**: `new IndexeddbPersistence("traceable-yjs", doc)`.

### 4.6. Liveblocks (Adapter: `@liveblocks/yjs`)

*   **Purpose**: Real-time synchronization of Yjs data.
*   **Integration**: `src/lib/states/yjs/load.ts` -> `loadFromLiveBlocks()`.
*   **Config**:
    *   Client: `createClient({ authEndpoint: import.meta.env.VITE_LIVEBLOCKS_AUTH_ENDPOINT })`.
    *   Room: `client.enterRoom("traceable-yjs")`.
    *   Provider: `new LiveblocksYjsProvider(room, doc)`.