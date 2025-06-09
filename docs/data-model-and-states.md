---
description: This document outlines the core domain models (`task`, `event`) in the Traceable application, their representation in code, and how their state is managed and synchronized using Yjs.
globs: 
alwaysApply: false
---
## 1. Core Domain Model: `task`

*   **Conceptual Representation:** A `task` is an item in the todolist, potentially nested, forming a hierarchical structure. It can have a name, notes, status, and relationships to other tasks (parents/children) and calendar events.
*   **Code Definition & Yjs Structure:**
    *   Primarily managed by `TaskProxy` located in `src/lib/states/meta/task.svelte.ts`.
    *   Each `TaskProxy` wraps a `Y.Map<any>` stored within the `tasks` collection in the `Repository` (`src/lib/states/yjs/repository.ts`).
    *   The `Y.Map` for a task stores:
        *   `id: string` (BSON ObjectID string, from `src/lib/states/meta/utils.ts`)
        *   `textId: string` (ID referencing a `Y.Text` object for the task's name)
        *   `noteId: string` (ID referencing a `Y.Text` object for the task's notes)
        *   `children: Y.Array<string>` (Stores an ordered list of child task IDs)
        *   `parents: Y.Array<string>` (Stores a list of parent task IDs)
        *   `events: Y.Array<string>` (Stores a list of associated event IDs)
        *   `status: "DONE" | "TODO" | "BLOCKED"` (Current status of the task)
    *   The actual textual content for `text` (name) and `note` are separate `Y.Text` objects, managed in the `texts` collection of the `Repository` and accessed via `textId` and `noteId`.

*   **Key Attributes (exposed by `TaskProxy`):**
    *   `id: string`
    *   `text: Y.Text` (the Yjs shared type for the task name)
    *   `note: Y.Text` (the Yjs shared type for the task notes)
    *   `children: TaskProxyIterable` (wraps `Y.Array<string>` of child IDs, see `src/lib/states/meta/array.ts`)
    *   `parents: TaskProxyIterable` (wraps `Y.Array<string>` of parent IDs)
    *   `events: EventProxyIterable` (wraps `Y.Array<string>` of event IDs)
    *   `status$: Observable<'DONE' | 'TODO' | 'BLOCKED'>` (Reactive stream of the task's status)
    *   `isCompleted$: Observable<boolean>`

*   **Relationship Management:**
    *   **Children & Parents:**
        *   Stored as `Y.Array<string>` within each task's `Y.Map`, holding the IDs of related tasks.
        *   `TaskProxyIterable` (`src/lib/states/meta/array.ts`) provides an abstraction over these `Y.Array`s for easier manipulation and iteration.
    *   **Bidirectional Linking:**
        *   Implemented in `TaskProxy` methods:
            *   `attachChild(child: TaskProxy, index?: number)`: Adds `child.id` to `this.children`'s Y.Array and `this.id` to `child.parents`' Y.Array.
            *   `detachChild(child: TaskProxy)`: Removes `child.id` from `this.children` and `this.id` from `child.parents`.
        *   These operations ensure that when a child is added to a parent, the parent is also added to the child's list of parents, and vice-versa for removal. The underlying operations `_attach` and `_detach` are in `YIterable` (`src/lib/states/meta/array.ts`).
    *   **Task-Event Association:**
        *   A `TaskProxy`'s `events` attribute (a `Y.Array<string>`) stores the IDs of all `EventProxy` instances scheduled for this task.
        *   `TaskProxy.insertEvent(start, end)`: Creates a new event via `EventProxyManager` and adds its ID to the task's `events` array.
        *   `TaskProxy.detachEvent(eventId)`: Removes an event ID from the task's `events` array.

## 2. Core Domain Model: `event`

*   **Conceptual Representation:** An `event` is a time block on the calendar, representing a scheduled period for a specific `task`.
*   **Code Definition & Yjs Structure:**
    *   Managed by `EventProxy` located in `src/lib/states/meta/event.svelte.ts`.
    *   Each `EventProxy` wraps a `Y.Map<any>` stored within the `events` collection in the `Repository`.
    *   The `Y.Map` for an event stores:
        *   `id: string` (BSON ObjectID string)
        *   `taskId: string` (ID of the associated `TaskProxy`)
        *   `start: number` (Timestamp in milliseconds for the event's start time)
        *   `end: number` (Timestamp in milliseconds for the event's end time)

*   **Key Attributes (exposed by `EventProxy`):**
    *   `id: string`
    *   `task: TaskProxy` (The associated task instance)
    *   `start: number` (Directly get/set, also `start$: Observable<number>`)
    *   `end: number` (Directly get/set, also `end$: Observable<number>`)

*   **Unique Association to `task`:**
    *   The `EventProxy` constructor (`src/lib/states/meta/event.svelte.ts`) retrieves the `taskId` from its underlying `Y.Map` and uses the `TaskProxyManager` (passed via `EventProxyManager`) to build the `TaskProxy` instance.
    *   When creating an event using `EventProxyManager.createEvent(task: TaskProxy, start: number, end: number)`, the `task.id` is explicitly used to set the `taskId` in the new event's Y.Map. This ensures each event is tied to exactly one task.

## 3. `task` & `event` Overall Relationship (CRUD)

*   **Creation:**
    *   `TaskProxyManager.newTask()`: Creates a new task entity (Y.Map) and its associated `Y.Text` for name and note in the respective Yjs collections.
    *   `EventProxyManager.createEvent(task, start, end)`: Creates a new event entity (Y.Map) linked to `task.id`. `TaskProxy.insertEvent()` then updates the task's `events` Y.Array.
*   **Reading:**
    *   Managers (`TaskProxyManager`, `EventProxyManager`) build proxy objects (`TaskProxy`, `EventProxy`) from the Yjs data.
    *   These proxies provide direct access to properties and RxJS Observables for reactive updates (e.g., `task.text$`, `event.start$`).
*   **Updating:**
    *   Task text/note: Modified directly through their `Y.Text` objects (e.g., via Quill editor bindings in `src/lib/components/todolist/item/TodoItem.svelte` and `src/lib/components/todolist/item/note/NoteEditor.svelte`).
    *   Task status: `TaskProxy.toggleStatus()` modifies the 'status' field in its Y.Map.
    *   Task relationships (children/parents): `TaskProxy.attachChild()`, `TaskProxy.detachChild()` modify the respective `Y.Array<string>`s.
    *   Event times: `EventProxy.start`, `EventProxy.end` setters, `EventProxy.setPeriod()`, `EventProxy.moveTo()`, `EventProxy.resizeTo()` modify the 'start' and 'end' fields in its Y.Map.
*   **Deletion:**
    *   `TaskProxy.deleteChild(childTask)`: If `childTask` has no other parents, `TaskProxyManager.deleteTaskDeeply(childTask)` is called, which removes its Y.Map and associated text/note Y.Texts. Otherwise, it's just detached.
    *   `EventProxy.destory()`: Removes the event's Y.Map from the `events` collection and calls `task.detachEvent(this.id)` to remove its ID from the task's `events` Y.Array.

## 4. Proxy Encapsulation Layer

Yjs raw objects (`Y.Map`, `Y.Array`, `Y.Text`) are encapsulated by proxy classes to provide a more domain-specific and developer-friendly API:

*   **Entity Proxies:**
    *   `TaskProxy` (`src/lib/states/meta/task.svelte.ts`): Wraps a `Y.Map` for a task.
    *   `EventProxy` (`src/lib/states/meta/event.svelte.ts`): Wraps a `Y.Map` for an event.
    *   `JournalProxy` (`src/lib/states/meta/journal.svelte.ts`): Wraps a `Y.Map` for a journal entry.
*   **Iterable Proxies (for Y.Array<string>):**
    *   `YIterable<T>` (`src/lib/states/meta/array.ts`): A generic base class wrapping a `Y.Array<string>` (storing IDs). It provides methods like `move`, `_attach`, `_detach`, and makes the collection iterable, yielding proxy objects of type `T` (e.g., `TaskProxy`, `EventProxy`) by using a factory function.
    *   `TaskProxyIterable` (type alias in `src/lib/states/meta/task.svelte.ts` for `YIterable<TaskProxy>`): Used for `task.children` and `task.parents`.
    *   `EventProxyIterable` (`src/lib/states/meta/event.svelte.ts`): Used for `task.events`.
*   **Reactivity:** These proxies expose RxJS `Observable`s for their properties (e.g., `task.text$`, `event.start$`, `task.status$`, `YIterable.$`). These observables are typically created by listening to Yjs `observe` events on the underlying Yjs types. Key utility functions for this include `observeYAttr` and `observeYText` (found, for example, in `src/lib/states/meta/event.svelte.ts`).

## 5. Other Yjs-Stored Models

Besides `task` and `event`, other data structures are stored and managed via Yjs:

*   **Journals (`JournalProxy`):**
    *   Definition: `src/lib/states/meta/journal.svelte.ts`.
    *   Storage: `Y.Map` per journal entry in the `journals` collection of the `Repository`.
    *   Represents time-bound entries (e.g., weekly logs) that are themselves tasks.
*   **User Preferences (`UserManager`):**
    *   Definition: `src/lib/states/meta/user.svelte.ts`.
    *   Storage: A single `Y.Map` named `user` in the `Repository`.
    *   Currently stores `rootTaskId` to identify the main entry point of the todolist.
*   **Panel States (`EditorPanelState`, `JournalPanelState`, `EditorItemState`):**
    *   Definition: `src/lib/states/states/panel_states.ts`.
    *   Storage: A `Y.Map` named `panelStates` in the `Repository`. Each key is a panel ID, and the value is typically another `Y.Map` holding panel-specific UI state, like `foldStatesTree` (a nested `Y.Map` mirroring task hierarchy to store folded states).

## 6. State Management Core (Yjs)

*   **Scope of Yjs:** Yjs is the foundational state management library, responsible for all CRDT-based data structures, conflict resolution, and providing the basis for persistence and real-time sync.
*   **`Y.Doc` Initialization and Access:**
    *   The `Y.Doc` is created by `newYDoc()` in `src/lib/states/yjs/load.ts`.
    *   It's initialized in `App.svelte` during the application startup.
    *   The global `db: Database` instance (from `src/state.ts`, initialized by `load(doc)`) holds the `Y.Doc`.
    *   The `Database` class (`src/lib/states/meta/database.svelte.ts`) acts as a central hub, containing the `doc`, the `Repository`, and all primary data managers. Components and services access Yjs data primarily through this `db` instance and its managers/proxies.
*   **Core Yjs Data Collections (managed by `Repository` in `src/lib/states/yjs/repository.ts`):**
    *   `tasks: Y.Map<Y.Map<any>>` (Stores individual task data, where each task is a `Y.Map`)
    *   `texts: Y.Map<Y.Text>` (Stores task names and notes as `Y.Text` objects)
    *   `events: Y.Map<Y.Map<any>>` (Stores individual event data)
    *   `journals: Y.Map<Y.Map<any>>` (Stores individual journal data)
    *   `panelStates: Y.Map<any>` (Stores UI state for various panels, often nested Y.Maps)
    *   `user: Y.Map<any>` (Stores user-specific global data)
*   **Data Flow Analysis:**
    *   **Svelte UI Updates:**
        *   Svelte components subscribe to RxJS `Observable`s exposed by the Proxy objects (e.g., `task.text$`, `task.children.$`, `event.start$`).
        *   These Observables are powered by Yjs's `observe` mechanism on the underlying `Y.Map`, `Y.Array`, or `Y.Text` instances. When the Yjs data changes, the `observe` callback fires, which in turn pushes a new value to the RxJS Observable, triggering a Svelte component re-render if it's subscribed (e.g., using the `$` auto-subscription).
        *   Files like `src/lib/states/meta/task.svelte.ts` (e.g., `TaskProxy.status$`, `TaskProxy.text$`) and `src/lib/states/meta/array.ts` (e.g., `YIterable.$`) contain this reactive glue.
    *   **IndexedDB Persistence:**
        *   Integration code: `loadFromIndexedDB(doc: Y.Doc)` in `src/lib/states/yjs/load.ts`.
        *   Uses `y-indexeddb` library's `IndexeddbPersistence`.
        *   Configuration: `new IndexeddbPersistence("traceable-yjs", doc)`.
        *   Persistence is automatic once the provider is initialized and synced. Changes to the `Y.Doc` are written to IndexedDB.
    *   **Liveblocks Synchronization:**
        *   Integration code: `loadFromLiveBlocks(doc: Y.Doc)` in `src/lib/states/yjs/load.ts`.
        *   Uses `@liveblocks/yjs` library's `LiveblocksYjsProvider`.
        *   Configuration: `createClient({ authEndpoint: import.meta.env.VITE_LIVEBLOCKS_AUTH_ENDPOINT })` and `client.enterRoom("traceable-yjs")`. The provider is then `new LiveblocksYjsProvider(room, doc)`.
        *   Synchronization is handled by the Liveblocks provider. Awareness (user presence/cursors) is a feature of Liveblocks, and the `QuillBinding` (`src/lib/components/quill/quill.ts`) has a placeholder comment for it (`/*, provider.awareness*/`), indicating potential or planned use.
*   **Transaction Principle:**
    *   Most operations that modify Yjs data are wrapped in `doc.transact(() => { ... })`.
    *   This is consistently applied in methods within `TaskProxy`, `EventProxy`, `YIterable`, and `Database` classes.
    *   Examples: `TaskProxy.detachChild()`, `EventProxy.setPeriod()`, `Database.import()`.
    *   This ensures atomicity of operations and efficient batching of updates for Yjs.