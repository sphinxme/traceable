---
description: This described the architecture and ui organization and core views of this project
globs: 
alwaysApply: false
---
## 1. Application Architecture

Traceable (this project) is a **Single Page Application (SPA)**.

*   **Entry Point**: The application's web content is initialized in `src/main.ts`, which mounts the root Svelte component `src/App.svelte` into the `index.html`'s `<div id="app">`.
*   **Routing**: Client-side routing is handled by `svelte-spa-router`. The routes are defined within `src/App.svelte`:
*   **Tauri Integration**: The Tauri backend, configured in `src-tauri/tauri.conf.json` and `src-tauri/src/lib.rs`, sets up a single main webview (`WebviewWindowBuilder::new(app, "main", WebviewUrl::default())`) that loads the `index.html` hosting the Svelte SPA.

## 2. UI Organization

The UI is structured into distinct pages, which are themselves compositions of reusable "Panel" components.

*   **Pages (Route Components)**: The primary UI sections are defined as Svelte components within the `src/routes/` directory and are mapped to URL paths in `src/App.svelte`. These include:
    *   `src/routes/TracePage.svelte`
    *   `src/routes/OrganizePage.svelte`
    *   `src/routes/SchedulePage.svelte`
    *   `src/routes/SettingsPage.svelte`
    *   `src/routes/DefaultPage.svelte` (acts as a redirect)

*   **Panels**: A common UI organization pattern involves "Panel" components located in `src/lib/panels/`. These panels encapsulate major functional areas or views and are composed by the Page components.
    *   For example, `src/routes/TracePage.svelte` uses a `PaneGroup` (from `src/lib/components/ui/resizable`) to display `src/lib/panels/calendar/Calendar.svelte` and `src/lib/panels/todo/Editor.svelte` side-by-side.
    *   This pattern is repeated in other route components like `src/routes/OrganizePage.svelte` and `src/routes/SchedulePage.svelte`, which combine different panels to form their specific layouts.
    *   Panels often serve as containers that provide context or manage state for the core view components they host.

## 3. Core Views Identification & Description

Two primary user views are central to Traceable's functionality: the Todolist View and the Calendar View.

### 3.1. Todolist View (Todo View)

This view allows users to manage tasks in an infinitely nested outline format.

*   **Primary Panel Component**: `src/lib/panels/todo/Editor.svelte` is the main panel orchestrating this view.
*   **Core View Component**: `src/lib/components/todolist/TodoView.svelte` is responsible for rendering the actual todolist structure.
    *   It receives a root `task: TaskProxy` for the current navigation level and an `rootItemState: Observable<EditorItemState>` to manage its UI state (e.g., folding).
    *   It displays the title of the current root task using `src/lib/panels/todo/Title.svelte`.
    *   It renders the list of child tasks using `src/lib/components/todolist/TodoList.svelte`.

*   **Rendering and Data Handling**:
    *   `src/lib/components/todolist/TodoList.svelte`:
        *   Takes a `parent: TaskProxy` and iterates over its `parent.children.$` (an observable `TaskProxyIterable`).
        *   For each child `task`, it recursively renders a `src/lib/components/todolist/Todo.svelte` component.
        *   Drag-and-drop functionality for reordering and nesting is facilitated by `src/lib/components/todolist/dnd/TaskDropable.svelte` components placed between items.
    *   `src/lib/components/todolist/Todo.svelte`:
        *   This component is key to the recursive structure. It displays the current task's details using `src/lib/components/todolist/item/TodoItem.svelte`.
        *   Crucially, if the current task (`$itemState.task`) is not folded (`!$itemState.folded`) and has children, it renders another instance of `src/lib/components/todolist/TodoList.svelte` for those children. This recursive rendering of `Todo.svelte` -> `TodoList.svelte` -> `Todo.svelte`... enables the infinite nesting.
    *   `src/lib/components/todolist/item/TodoItem.svelte`:
        *   Displays the task's editable name (via a Quill editor bound to `task.text: Y.Text`), its notes (from `task.note: Y.Text`, also potentially via Quill in `src/lib/components/todolist/item/note/NoteEditor.svelte`), and any associated event indicators (`src/lib/components/todolist/item/event/EventIndicator.svelte`).
        *   Manages UI elements for task interaction like folding (`CollapseButton.svelte`) and context menus.

*   **Infinite Nesting**:
    *   Achieved through the recursive structure of `Todo.svelte` rendering `TodoList.svelte`.
    *   The data model `TaskProxy.children` (a `Y.Array<string>` storing child task IDs) directly supports this hierarchical representation.
    *   The `EditorItemState` (from `src/lib/states/states/panel_states.ts`), particularly its `folded` property, controls the visibility of nested lists.

*   **Bidirectional Linking**:
    *   The `TaskProxy` data model (`src/lib/states/meta/task.svelte.ts`) includes `parents: TaskProxyIterable` (a `Y.Array<string>` of parent task IDs) in addition to `children`.
    *   When a task is attached as a child (e.g., `parentTask.attachChild(childTask)`), the `childTask.parents` list is updated to include `parentTask.id`.
    *   This allows a single task to be a child of multiple parent tasks, fulfilling the bidirectional linking requirement. The UI primarily renders based on the `children` relationship for a given parent.

### 3.2. Calendar View (Scheduling View)

This view provides a visual calendar for scheduling tasks as events.

*   **Primary Panel Component**: `src/lib/panels/calendar/Calendar.svelte` serves as the container for this view.
*   **Core View Component**: It primarily uses `src/lib/components/calendar/Calendar.svelte`, which in turn delegates rendering to `src/lib/components/calendar/views/Week.svelte`.

*   **Rendering and Data Handling**:
    *   `src/lib/components/calendar/views/Week.svelte`:
        *   Constructs a grid representing days and time slots.
        *   Fetches and displays `EventProxy` instances using the `EventProxyManager` (passed as `manager`). It queries events within a date range: `manager.queryByRange$(displayStartDay.valueOf(), displayEndDay.valueOf())`.
        *   For each `event` retrieved, it renders a `src/lib/components/calendar/views/WeekEvent.svelte` component.
        *   Handles interactions like dragging tasks from the todolist onto the calendar to create new events. This uses the `dayExternalDropZone` action from `src/lib/components/calendar/views/interact.svelte.ts`, which calls `task.insertEvent()` upon a successful drop.
    *   `src/lib/components/calendar/views/WeekEvent.svelte`:
        *   Receives an `event: EventProxy` and its associated `task: TaskProxy` (obtained via `event.task`).
        *   Calculates its visual position and dimensions on the calendar grid based on `event.start$` (observable start time) and `event.end$` (observable end time).
        *   Displays the `task.text$`.
        *   Uses `interactjs` (configured in `src/lib/components/calendar/views/interact.svelte.ts` and applied in `WeekEvent.svelte`) to enable dragging (to change start/end day/time) and resizing (to change duration) of events directly on the calendar. These interactions update the `event.start` and `event.end` properties.

*   **Event-Task Association**:
    *   Each `EventProxy` (`src/lib/states/meta/event.svelte.ts`) stores a `taskId: string` and provides a `task: TaskProxy` property, establishing a direct link to the `TaskProxy` it represents.
    *   A single `Task` can be associated with multiple `Event` instances (e.g., a task broken down into several work sessions).

## 4. Panel & View Association

The `src/lib/panels/` directory contains components that orchestrate and provide context for the core views:

*   **`src/lib/panels/todo/Editor.svelte`**:
    *   **Role**: The main interface for the todolist functionality.
    *   **Composition**:
        *   Embeds `src/lib/components/todolist/TodoView.svelte` to display and manage the interactive task list.
        *   Uses `src/lib/panels/todo/Navigator.svelte` to show breadcrumb-style navigation for the current zoomed path within the todolist, managed by `EditorPanelState`.

*   **`src/lib/panels/calendar/Calendar.svelte`**:
    *   **Role**: Displays the main scheduling calendar.
    *   **Composition**:
        *   Wraps `src/lib/components/calendar/Calendar.svelte` (which uses `src/lib/components/calendar/views/Week.svelte`) to render the calendar grid and events. It passes the `eventProxyManager` for data fetching.

*   **`src/lib/panels/schedule/Schedule.svelte`**:
    *   **Role**: Appears to provide a journal-based (now weekly journal only) view of tasks.
    *   **Composition**:
        *   Primarily uses `src/lib/panels/schedule/Weekly.svelte`.    
            *   **Role**: Displays tasks grouped by week, likely leveraging `JournalProxy` entities.
            *   **Composition**:
                *   For each `JournalProxy` (representing a week, e.g., `weekDoc`), it renders an instance of `src/lib/components/todolist/TodoView.svelte`.
                *   The `task` prop for `TodoView` is set to `weekDoc.task` (the `TaskProxy` associated with that journal entry).
                *   It uses `JournalPanelState` (from `src/lib/states/states/panel_states.ts`) to manage the UI state (like folding) of tasks within this weekly context.

These panels are then assembled into complete page layouts by the route components in `src/routes/` (e.g., `TracePage.svelte`, `OrganizePage.svelte`).