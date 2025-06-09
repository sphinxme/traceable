---
description: This document details src/lib/, the core Traceable Svelte code directory, outlining major subdirectories and key files to aid understanding and locating functionalities.
globs: 
alwaysApply: false
---
*   **`src/lib/`**
    *   **`components/`**: Contains reusable Svelte components, categorized by functionality or UI concern.
        *   **`calendar/`**: Components related to the calendar/scheduling view.
            *   **`views/`**: Lower-level components specifically for rendering parts of the calendar, like a week or an event.
                *   `interact.svelte.ts`: Svelte actions using `interactjs` for drag-and-drop and resizing functionality within the calendar view, specifically for `EventProxy` manipulation (e.g., `dayDropZone`, `dayExternalDropZone`, `interactAction`).
                *   `utils.svelte.ts`: Utility functions for calendar calculations like `percent` (of day), `range`, `roundToNearest15Minutes`, `isRestDay`.
                *   `Week.svelte`: Core component for rendering the weekly calendar grid, including days, time slots, and event placement. Handles drag-and-drop of tasks onto the calendar to create events.
                *   `WeekEvent.svelte`: Renders a single event block on the `Week.svelte` grid. Manages its own drag/resize interactions (via `interactjs`), display of event details (`TaskProxy` text, start/end times), and context menus.
            *   `Calendar.svelte`: A higher-level wrapper component for the calendar view, primarily embedding the `Week.svelte` component.
        *   **`dnd/`**: Generic drag-and-drop utilities and Svelte actions.
            *   `draggable.ts`: Exports a Svelte action `draggable<T>` that makes an HTML element draggable. It uses `event.dataTransfer` and manages a global `dragging` store.
            *   `droppable.ts`: Exports a Svelte action `droppable<T>` for creating drop zones. It handles `ondragenter`, `ondragleave`, `ondragover`, and `ondrop` events, differentiating between "move" and "link" operations based on `event.shiftKey` and custom logic.
            *   `icons.ts`: Exports `Image` objects (`moveImg`, `linkImg`) used as drag images.
            *   `state.ts`: Manages global D&D state:
                *   `dragging: Writable<boolean>`: A Svelte store indicating if a drag operation is in progress.
                *   `setDnDData<T>(channel: string, data: T)` / `getDnDData<T>(channel: string): T`: Functions to store and retrieve data associated with a D&D operation on a specific channel.
        *   **`loading/`**:
            *   `Loading.svelte`: A component to display loading indicators for multiple asynchronous operations (promises). Shows status (loading, loaded, error) for each item.
        *   **`quill/`**: Integration with the Quill rich text editor.
            *   `model.ts`: Defines types for Quill keyboard handlers (`KeyboardHandler`) and a wrapper function `warpKeyHandler` to integrate custom handlers with Quill's API.
            *   `quill.ts`: Exports a Svelte action `quill` that initializes a Quill editor on an HTML element and binds it to a Yjs `Y.Text` object using `QuillBinding` from `y-quill`.
        *   **`setting/`**:
            *   `Setting.svelte`: Component for application settings, specifically providing UI for import/export of application data (`db.export()`, `db.import()`) and clearing all data (`db.clear()`).
        *   **`sidebar/`**:
            *   `SidebarItem.svelte`: A reusable component for items in the main application sidebar, handling navigation via `svelte-spa-router`.
        *   **`todolist/`**: Components specifically for the todolist (Workflowy/幕布-like) view.
            *   **`dnd/`**: Drag-and-drop logic specific to todolist tasks.
                *   `index.ts`: Exports `DragingTaskData` interface (unused in current files, seems like a potential type).
                *   `state.ts`:
                    *   `draggingTaskId: Writable<string>`: Svelte store holding the ID of the task currently being dragged.
                    *   `TaskDnDData`: Type definition for data passed during task D&D (`originPanelId`, `draggingTask: TaskProxy`, `originParentTask: TaskProxy`).
                *   `TaskDraggable.svelte`: A wrapper component that makes its child content draggable using the generic `draggable` action. It sets up `TaskDnDData` for the "tasks" channel.
                *   `TaskDropable.svelte`: Component creating drop zones between task items or as children of tasks. Uses the generic `droppable` action and implements logic for moving or linking tasks (`TaskProxy`) within or between panels.
            *   **`item/`**: Components related to rendering a single task item within the list.
                *   **`event/`**:
                    *   `EventIndicator.svelte`: Displays a small visual indicator (a colored bar) for each `EventProxy` associated with a task. Shows event details on hover using `HoverCard`.
                *   **`note/`**:
                    *   `NoteEditor.svelte`: A Quill editor component specifically for editing a task's note (`Y.Text`). Used within a Popover in `TodoItem.svelte`.
                *   **`overlay/`**: Components for the overlay UI that appears on task items (e.g., on hover).
                    *   `CheckButton.svelte`: (Not directly used by core Todo components, but a UI element) Renders a checkable circle icon.
                    *   `CollapseButton.svelte`: Renders a chevron icon to toggle the folded state of a task item. Interacts with `EditorItemState.folded`.
                    *   `colors.ts`: Exports a `colors` object mapping task statuses (`TODO`, `BLOCK`, `DONE`) to Tailwind CSS background color classes.
                    *   `Handle.svelte`: Renders the circular "bullet" or handle for a task item. Clicking it can trigger zooming into the task. It uses `colors.ts` for status indication.
                    *   `Overlay.svelte`: A simple layout component to position overlay elements relative to a task item.
                *   `TodoItem.svelte`: The core component for displaying a single task's content (title, note preview, event indicators). It initializes Quill for the task's title (`task.text`). It also manages the popover for the `NoteEditor`.
            *   `Todo.svelte`: Represents a single item in the todolist. It includes:
                *   `TodoItem.svelte` to display its own content.
                *   A nested `TodoList.svelte` to display its children if it's not folded.
                *   Handles keyboard navigation (up, down, tab, untab) and operations like inserting new tasks.
                *   Manages its own `EditorItemState` and provides context for its children.
                *   Integrates drag-and-drop via `TaskDraggable.svelte` (for itself) and `TaskDropable.svelte` (for its children).
            *   `TodoList.svelte`: Renders a list of `Todo.svelte` components for a given parent task. It handles:
                *   Iterating through `parent.children.$`.
                *   Placing `TaskDropable.svelte` zones between items.
                *   Recursive rendering of the task hierarchy.
                *   Focus management and keyboard navigation between its items.
            *   `TodoView.svelte`: The main entry point for displaying a todolist rooted at a specific `TaskProxy`. It manages:
                *   The overall structure including an optional `Title.svelte` for the root task.
                *   The top-level `TodoList.svelte` for the root task's children.
                *   An "Add Task" button.
                *   Context setup for `EditorItemState` and view transitions.
            *   `types.ts`: Defines `KeyboardController` interface (though seemingly not fully utilized for complex keyboard mapping in current components).
        *   **`ui/`**: Contains UI primitive components, largely based on `shadcn-svelte` and `bits-ui`. These are general-purpose UI building blocks.
            *   `badge/`, `breadcrumb/`, `button/`, `command/`, `context-menu/`, `dialog/`, `dropdown-menu/`, `hover-card/`, `popover/`, `scroll-area/`, `sonner/` (for toasts), `tabs/`, `textarea/`, `toggle/`, `toggle-group/`, `tooltip/`: Each directory contains Svelte components for these respective UI elements, typically re-exporting from an `index.ts`.
            *   **`focusable/`**:
                *   `Focusable.svelte`: A utility component that scrolls its container into view when its `focus` prop is true. Used for automatically focusing on elements like the current week in `Weekly.svelte`.
            *   **`resizable/`**:
                *   `index.ts`: Exports `PaneGroup`, `Pane`, `PaneResizer` from `paneforge`.
                *   `pane-resizer.svelte`: A styled `PaneResizer` component for use with `paneforge`.
        *   `ObservableText.svelte`: A simple component that subscribes to an RxJS `Observable<string>` (prop `text`) and displays its emitted values, with a `defaultText`.
    *   **`panels/`**: Higher-level components that structure the main views of the application, often corresponding to routes or major UI sections.
        *   **`calendar/`**:
            *   `Calendar.svelte`: The main panel component for the calendar view. It primarily instantiates `lib/components/calendar/Calendar.svelte` and passes the `eventProxyManager`.
        *   **`schedule/`**:
            *   `Schedule.svelte`: The panel for the "Schedule" page/view. It instantiates `Weekly.svelte`.
            *   `Weekly.svelte`: Displays a list of weekly journal entries. Each entry is a `TaskProxy` (the journal task) and is rendered using `TodoView.svelte`. It manages generating journal tasks for a range of weeks.
        *   **`todo/`**: Components specific to the main "Editor" or "Todo" panel.
            *   `context.svelte.ts`:
                *   `initRegister()`: Initializes a Svelte context (`registerTodoItem`) that allows `Todo.svelte` instances to register themselves based on their `TaskProxy.id`. This is used by `highlightTaskSignal` to find and focus specific task instances.
                *   `getRegisterFromContext()`: Retrieves the registration function from context.
            *   `Editor.svelte`: The main panel for the todolist/editor view. It:
                *   Initializes `EditorPanelState`.
                *   Renders `Navigator.svelte` for breadcrumbs/zooming.
                *   Renders `TodoView.svelte` for the current root task.
                *   Responds to `highlightTaskSignal` to focus on tasks requested by other parts of the application (e.g., calendar event clicks).
            *   `Navigator.svelte`: Displays breadcrumb-style navigation for the current zoom path in the `Editor.svelte` panel. Allows users to navigate up the task hierarchy. Interacts with `EditorPanelState.pop()` and coordinates view transitions.
            *   `state.svelte.ts`:
                *   `loadEditorPanelState(panelId, panelStates, rootTask)`: Factory/singleton accessor for `EditorPanelState`.
                *   `loadJournalPanelState(panelId, panelStates)`: Factory/singleton accessor for `JournalPanelState`.
            *   `Title.svelte`: A component to display and edit the title of a task, typically the root task of a `TodoView`. Uses Quill for editing and handles specific keyboard events (Enter, ArrowUp, ArrowDown).
    *   **`states/`**: Contains all state management logic, data models (proxies), and Yjs integration.
        *   **`meta/`**: Defines the core data models (proxies) and their managers, abstracting Yjs details.
            *   `array_utils.ts`: Contains a utility function `move<T>(arr: ArrayLike<T>, item: T, newIndex: number)` for reordering items in a Yjs-compatible array-like structure.
            *   `array.ts`: Defines `YIterable<T>`, a base class that wraps a `Y.Array<string>` (storing IDs) and a factory function to create instances of `T`. It provides methods for manipulation (`move`, `_attach`, `_detach`) and an RxJS observable (`$`) for reactivity.
            *   `database.svelte.ts`:
                *   `Database`: A central class that initializes and holds the `Y.Doc`, `Repository`, and all major proxy managers (`TaskProxyManager`, `EventProxyManager`, etc.). Provides `import()` and `export()` functionality for the entire dataset.
            *   `event.svelte.ts`:
                *   `EventProxyManager`: Manages `EventProxy` instances, queries events by range, and handles creation/deletion.
                *   `EventProxy`: Wraps a Yjs `Y.Map` representing a calendar event. Provides reactive observables for `start` and `end` times and methods to modify event timing (`moveTo`, `resizeTo`, `setPeriod`, `destory`).
                *   `EventProxyIterable`: A `YIterable` specialized for `EventProxy` instances, typically used within `TaskProxy.events`.
            *   `journal.svelte.ts`:
                *   `JournalProxyManager`: Manages `JournalProxy` instances. `getOrCreateJournal` is a key method.
                *   `JournalProxy`: Represents a journal entry (e.g., a weekly log). It's essentially a `TaskProxy` with associated `time` (Dayjs) and `type` (JournalType).
            *   `task.svelte.ts`:
                *   `TaskProxyManager`: Manages `TaskProxy` instances and their associated `Y.Text` for names and notes. Handles creation, retrieval (building), and deep deletion of tasks.
                *   `TaskProxy`: The core data model for a to-do item. Wraps a Yjs `Y.Map` and provides:
                    *   Access to its `id`, `textId`, `noteId`, `status`.
                    *   Reactive observables for `text$`, `note$`, `status$`, `isCompleted$`.
                    *   `Y.Text` instances for `text` and `note` (via `textRepository`).
                    *   `TaskProxyIterable` for `children` and `parents` (enabling bi-directional linking).
                    *   `EventProxyIterable` for associated `events`.
                    *   Methods for managing children (`attachChild`, `insertChild`, `detachChild`, `deleteChild`) and events (`insertEvent`, `detachEvent`).
            *   `user.svelte.ts`:
                *   `UserManager`: Manages user-specific data, primarily the `rootTaskId` which points to the absolute root of the user's todolist. Ensures a root task always exists.
            *   `utils.ts`: Exports `id() => ObjectID().toHexString()` for generating unique BSON-like ObjectIDs.
        *   **`states/`**: Contains higher-level UI state management, particularly for panels.
            *   `panel_states.ts`: Defines classes for managing panel-specific UI states like folded states and navigation paths.
                *   `EditorPanelState`: Manages the state for an editor panel, including the current `paths` (zoom level, an RxJS `BehaviorSubject`) and a `foldStatesTree` (a Yjs `Y.Map`) for persisting task folded states within that panel's view.
                *   `JournalPanelState`: Similar to `EditorPanelState` but tailored for journal views (like `Weekly.svelte`).
                *   `EditorItemState`: Represents the state of an individual task item as displayed in a panel (e.g., its folded status, its relative path within the current view). It interacts with the `foldStatesTree` of its parent panel state.
        *   **`yjs/`**: Low-level Yjs setup and repository definition.
            *   `load.ts`:
                *   `newYDoc()`: Creates a new `Y.Doc`.
                *   `loadFromIndexedDB(doc: Y.Doc)`: Sets up `y-indexeddb` persistence for the given Yjs document.
                *   `loadFromLiveBlocks(doc: Y.Doc)`: Sets up `@liveblocks/yjs` provider for real-time sync.
            *   `repository.ts`:
                *   `Repository`: Defines the "schema" of the Yjs document by managing named `Y.Map`s for different data types (`tasks`, `texts`, `journals`, `events`, `panelStates`, `user`). Provides methods to create, get, and delete Yjs data structures (e.g., `newYTask`, `getYText`). Implements `YTaskFactory`, `YTextFactory`, `YEventRepository` interfaces used by proxy managers.
        *   `signals.svelte.ts`:
            *   `highlightTaskSignal: Subject<{ id: string, index: number }>`: An RxJS Subject used to signal that a specific task (by ID) should be highlighted or focused, potentially cycling through multiple instances if a task appears in several places.
        *   `stores.svelte.ts`: Contains miscellaneous Svelte 5 runes-based global UI states.
            *   `highlightFEventIds: Record<string, boolean> = $state({})`: Tracks which event IDs are currently highlighted (e.g., on hover from `EventIndicator`).
            *   `foucsingEventIds: Record<string, boolean> = $state({})`: Tracks which event IDs should be actively focused/scrolled to in the calendar.
            *   `transitioningPaths: TaskProxy[] = $state([])`: Stores the task path that is currently undergoing a view transition (zoom in/out), used by `Navigator.svelte` and `Todo.svelte` to apply correct `view-transition-name`s.
            *   `taskTodoItems: Record<string, Todo[]> = $state({})`: (Seems to be related to `focusOnNextTask` but `focusOnNextTask` itself is commented out or not fully implemented in the provided code for general use).
    *   `index.ts`: Typically used for re-exporting key modules from `src/lib/` but is currently empty in the provided codebase. Its presence suggests it might be used for defining the public API of the library if this project were to be used as a package.
    *   `utils.ts`:
        *   `cn(...inputs: ClassValue[]): string`: A utility function (common in shadcn-svelte projects) that merges Tailwind CSS classes using `clsx` and `tailwind-merge`.