---
description: This document detailed TodoView.svelte Detailed Design and Implementation
globs: 
alwaysApply: false
---
## 1. Component Identification and Location

*   **Primary Component File:** `src/lib/components/todolist/TodoView.svelte`
*   **Supporting Core Components:**
    *   `src/lib/components/todolist/TodoList.svelte`: Renders a list of tasks under a parent.
    *   `src/lib/components/todolist/Todo.svelte`: Renders a single task item, including its own `TodoItem` and potentially a nested `TodoList` for its children.
    *   `src/lib/components/todolist/item/TodoItem.svelte`: Renders the visual details of a task (text, note, events).
    *   `src/lib/panels/todo/Title.svelte`: Renders the title for the root task of the `TodoView`.
*   **Usage and Core Role:**
    *   `TodoView.svelte` is imported and used as the main component to display a hierarchical task list within different panels.
    *   **`src/lib/panels/todo/Editor.svelte`**: Uses `TodoView` to display the main, navigable todolist.
        ```svelte
        <TodoView
            bind:this={todoView}
            showTitle={!$rootItemState.isRoot}
            task={currentTask}
            {rootItemState}
        />
        ```
    *   **`src/lib/panels/schedule/Weekly.svelte`**: Uses `TodoView` for each weekly journal entry to display its associated tasks.
        ```svelte
        <TodoView
            highlightTitle={isCurrentWeek(weekDoc.time)}
            showTitle
            task={weekDoc.task}
            rootItemState={panelState.loadChild(weekDoc.task)}
        />
        ```
    This confirms `TodoView.svelte` acts as a versatile and central piece for rendering task hierarchies.

## 2. Component Responsibilities and Core Function Implementation

`TodoView.svelte` is responsible for:
*   Setting up the initial context for a specific view of the todolist, including its root `EditorItemState`.
*   Optionally displaying a title for the root `task` of the view using `Title.svelte`.
*   Rendering the direct children of the root `task` using `TodoList.svelte`.
*   Providing an "Add Task" button at the bottom of the view to add new children to the root `task`.
*   Managing and coordinating Svelte view transitions for zooming in/out of tasks.
*   Providing a `focusByLocation` function via context to allow parent components to programmatically focus on deeply nested tasks.

### Core Function Implementations:

*   **`task` Infinite Layer Rendering:**
    *   `TodoView.svelte` itself doesn't recurse. It renders a single `TodoList.svelte` for its `task` prop (which acts as the parent for this `TodoList`).
    *   `TodoList.svelte` iterates over its `parent.children.$` (an observable list of `TaskProxy`):
        ```svelte
        {#each $children as child, i (child.id)}
            <Todo ... task={child} parent={parent} ... />
        {/each}
        ```
    *   `Todo.svelte` then renders the `child` task. Crucially, `Todo.svelte` itself contains another `<TodoList ... parent={task} ... />` for rendering the children of *its* own `task`. This nested structure of `TodoList` -> `Todo` -> `TodoList` creates the infinite hierarchy.
        *   The folded state, managed by `EditorItemState` (e.g., `$itemState.folded` in `Todo.svelte`), controls the `display` prop of the nested `TodoList.svelte`, effectively hiding or showing sub-levels.

*   **`task` Content Display & Editing:**
    *   **Title (`text`):**
        *   If `showTitle` is true, `TodoView.svelte` uses `Title.svelte` which internally uses the `quill` action:
            ```svelte
            <!-- src/lib/panels/todo/Title.svelte -->
            <div use:quill={{ text, configs, init }}></div>
            ```
            where `text` is `task.text` (a `Y.Text` instance from `TaskProxy`).
        *   Individual task items within `Todo.svelte` use `TodoItem.svelte`:
            ```svelte
            <!-- src/lib/components/todolist/item/TodoItem.svelte -->
            <div
                class="todoitem w-full"
                style:view-transition-name={titleViewTransitionName}
                ...
                bind:this={container} <!-- Quill is initialized on this div -->
            ></div>
            ```
            The `onMount` function in `TodoItem.svelte` initializes Quill on `container` and binds it to `task.text` via `new QuillBinding(text, editor)`.
    *   **Note (`note`):**
        *   `TodoItem.svelte` displays the note content (`$note`) and uses a `Popover` with `NoteEditor.svelte` for editing:
            ```svelte
            <!-- src/lib/components/todolist/item/TodoItem.svelte -->
            <Popover.Root bind:open={isNoteEditOpen}>
                <Popover.Trigger>
                    <div ...>{$note}</div>
                </Popover.Trigger>
                <Popover.Content ...>
                    <NoteEditor bind:this={noteEditor} ... text={task.note} />
                </Popover.Content>
            </Popover.Root>
            ```
            `NoteEditor.svelte` also uses the `quill` action bound to `task.note` (another `Y.Text` instance).
    *   The `quill` action (`src/lib/components/quill/quill.ts`) establishes the two-way binding between the Quill editor UI and the Yjs `Y.Text` objects.

*   **`task` Creation, Deletion, Modification:**
    *   **Creation:**
        *   `TodoView.svelte`: An "Add Task" button at the bottom:
            ```svelte
            <div role="button" ... onclick={() => { task.insertChild(); }}>
                <CirclePlus size={16} />
            </div>
            ```
            This calls `insertChild()` on the `TodoView`'s root `task`.
        *   `TodoList.svelte`: `insertItem(i, text, focusToNew)` calls `parent.insertChild(i, text)`.
        *   `Todo.svelte` (`itemEnterHandler`): Can call `insertBeforeMyself(text)` or `insertAfterMyself(text)` (props passed from `TodoList.svelte` which call `parent.insertChild()`), or if the task has children, it calls `todoList.insertItem(0, "")` on its nested `TodoList`.
    *   **Deletion:**
        *   `Todo.svelte`: A context menu item provides the delete functionality:
            ```svelte
            <ContextMenu.Item ... onclick={() => parent.deleteChild(task)}>
                删除
            </ContextMenu.Item>
            ```
            This calls `deleteChild()` on the `parent` task of the item being deleted.
    *   **Modification (Drag & Drop for reordering/re-parenting):**
        *   `Todo.svelte` uses `TaskDraggable.svelte` (`src/lib/components/todolist/dnd/TaskDraggable.svelte`) to make items draggable.
        *   `TodoList.svelte` uses `TaskDropable.svelte` (`src/lib/components/todolist/dnd/TaskDropable.svelte`) to create drop zones between items.
        *   `TaskDropable.svelte`'s `droppableOptions`:
            *   `onMove({ draggingTask, originParentTask })`:
                If same parent: `parent.children.move(draggingTask.id, index);`
                If different parent: `originParentTask.detachChild(draggingTask); parent.attachChild(draggingTask, index);`
            *   `onLink({ draggingTask })`: `parent.attachChild(draggingTask, index);`
            These methods (`move`, `detachChild`, `attachChild`) are defined on `TaskProxy` and `TaskProxyIterable` and update the Yjs arrays for `children` and `parents`.

*   **Bidirectional Linking (UI & Data Consistency):**
    *   **UI:** A task can appear under multiple parents because `Todo.svelte` is instantiated for each child ID found in a parent's `children` array. The UI doesn't explicitly list `task.parents` on an item, but its multiple occurrences reflect this.
    *   **Data Consistency:** Handled within `TaskProxy` methods:
        *   `TaskProxy.attachChild(child: TaskProxy, index?: number)`:
            ```typescript
            // src/lib/states/meta/task.svelte.ts
            child.parents._attach(this.id);
            this.children._attach(child.id, index);
            ```
        *   `TaskProxy.detachChild(child: TaskProxy)`:
            ```typescript
            // src/lib/states/meta/task.svelte.ts
            child.parents._detach(this.id);
            this.children._detach(child.id);
            ```
        *   These `_attach` and `_detach` methods on `TaskProxyIterable` (which wraps `Y.Array`) ensure both `children` of the parent and `parents` of the child are updated in Yjs.

*   **`event` Association UI:**
    *   `TodoItem.svelte` (used within `Todo.svelte`):
        ```svelte
        // src/lib/components/todolist/item/TodoItem.svelte
        {#each sortedEvents as event (event.id)}
            <EventIndicator data={event} isCompleted={$isCompleted} />
        {/each}
        ```
        It iterates through `task.events.$` (an `Observable<EventProxyIterable>`) and renders an `EventIndicator.svelte` for each associated event.
    *   `EventIndicator.svelte` (`src/lib/components/todolist/item/event/EventIndicator.svelte`) displays a small, proportionally sized bar. Hovering shows a `HoverCard` with event details. Clicking it sets `foucsingEventIds[data.id] = true;` which can be observed by the calendar view.

## 3. Data Interaction and State Management (yjs)

*   **Fetching and Subscribing to `task` Data:**
    *   `TodoView.svelte` receives its root `task: TaskProxy` and `rootItemState: Observable<EditorItemState>` via props.
    *   `TodoList.svelte` receives `parent: TaskProxy` as a prop and subscribes to its children via `$derived(parent.children.$)`. `parent.children` is a `TaskProxyIterable` which wraps a `Y.Array` of task IDs and provides an observable.
    *   `Todo.svelte` receives `task: TaskProxy`. It gets its `EditorItemState` by subscribing to `$parentState.loadChild(task).$`.
    *   `TodoItem.svelte` directly uses observables from the passed `task: TaskProxy` prop, e.g., `task.text` (a `Y.Text`), `task.note$`, `task.isCompleted$`, `task.events.$`. These observables are created within `TaskProxy` (e.g., `registerYText` or `observeYAttr` for map properties) and ultimately rely on Yjs's `observe` mechanism.

*   **Updating Yjs Data on User Actions:**
    *   Most actions (create, delete, link, change status) are methods on `TaskProxy` or `TaskProxyIterable`.
    *   Example: `TaskProxy.toggleStatus()`:
        ```typescript
        // src/lib/states/meta/task.svelte.ts
        public toggleStatus() {
            this.yMap.set('status', this.status === 'DONE' ? 'TODO' : 'DONE')
        }
        ```
        This directly modifies the `Y.Map` underlying the `TaskProxy`.
    *   Example: `TaskProxy.insertChild()` calls `this.manager.newTask()` which then calls `this.attachChild()`. `attachChild` performs:
        ```typescript
        // src/lib/states/meta/task.svelte.ts
        child.parents._attach(this.id); // Modifies child's parents Y.Array
        this.children._attach(child.id, index); // Modifies this task's children Y.Array
        ```
    *   Yjs transactions are used implicitly by Yjs shared types for individual operations. Explicit transactions (`this.yMap.doc?.transact(() => { ... })`) are used in `TaskProxy` for operations involving multiple Yjs changes, like `detachChild` or `deleteChild`, to ensure atomicity.
        ```typescript
        // src/lib/states/meta/task.svelte.ts - TaskProxy.detachChild
        public detachChild(child: TaskProxy) {
            this.yMap.doc?.transact(() => {
                child.parents._detach(this.id);
                this.children._detach(child.id);
            });
        }
        ```

*   **Responding to External Yjs Changes:**
    *   Svelte 5 Runes are heavily used. Observables derived from Yjs data trigger re-renders when the underlying data changes.
    *   `$derived` is used to react to changes in observables, e.g., in `TodoList.svelte`: `let children = $derived(parent.children.$);`.
    *   Direct assignment of observables to reactive variables, e.g., in `TodoItem.svelte`: `let isCompleted = task.isCompleted$;`.
    *   The `YIterable.$` observable (`src/lib/states/meta/array.ts`) and various observables in `TaskProxy` (`text$`, `status$`, etc.) are built using RxJS `Observable` that wrap Yjs `observe` calls.
        ```typescript
        // src/lib/states/meta/array.ts - YIterable.$
        this.observableCache = new Observable<YIterable<T>>(subscriber => {
            subscriber.next(this);
            return YIterable.register(this.yArray, () => { // YIterable.register calls yArray.observe
                subscriber.next(this);
            })
        }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
        ```

## 4. Svelte API Usage (Props, Events, Slots, Context, Runes)

*   **`TodoView.svelte`:**
    *   **Props:**
        *   `task: TaskProxy` (required): The root task for this view.
        *   `showTitle?: boolean` (default: `true`): If true, displays the title area using `Title.svelte`.
        *   `highlightTitle?: boolean` (optional): Passed to `Title.svelte` to indicate if it should be visually highlighted.
        *   `rootItemState: Observable<EditorItemState>` (required): The observable state for the root task item of this view, used to initialize context.
    *   **Events:** None dispatched via `createEventDispatcher`.
    *   **Slots:** None.
    *   **Context:**
        *   `setContext("send", send)` & `setContext("receive", receive)`: For Svelte's `crossfade` transition.
        *   `setContext("focusByLocation", foucsByLocation)`: Provides a function to programmatically focus on a nested task.
        *   `setContext("setTitleViewTransitionName", setTitleViewTransitionName)`: Function to set view transition name for the title.
        *   `setContext("setRootTodoListViewTransitionName", setRootTodoListViewTransitionName)`: Function to set view transition name for the root list.
        *   `setStateIntoContext(rootItemState)`: Sets the `EditorItemState` for the current view. This context is consumed by `TodoList.svelte` and subsequently by `Todo.svelte` to get their respective states.
    *   **Runes:**
        *   `let todoList: TodoList;` (binding)
        *   `let title: Title;` (binding)
        *   `let titleViewTransitionName = $state("");`
        *   `let rootTodoListViewTransitionName = $state("");`
        *   `$effect(() => { setStateIntoContext(rootItemState); });` (ensures context is updated if `rootItemState` prop changes).

## 5. Internal Logic & Key Functions/Variables

*   **`TodoView.svelte`:**
    *   `foucsByLocation(paths: TaskProxy[], index: number, highlight: boolean = false)`: An exported function that delegates focusing to the `todoList` instance.
    *   `setTitleViewTransitionName(name: string)` / `setRootTodoListViewTransitionName(name: string)`: Functions to manage Svelte's view transition names dynamically, primarily used during zoom in/out operations coordinated with `Navigator.svelte` and `Todo.svelte`.
    *   The component orchestrates the overall structure: an optional `Title` for the current root task, the main `TodoList` for its children, and an "add new task" button.

## 6. Interaction with Other Components

*   **`Editor.svelte` (`src/lib/panels/todo/Editor.svelte`):**
    *   Instantiates `TodoView` for the main editor panel.
    *   Passes `rootTask` (from `db.userManager.rootTask`) and `rootItemState` (derived from `EditorPanelState`) as props.
    *   Calls `todoView.foucsByLocation()` in response to `highlightTaskSignal` to focus on specific tasks.
    *   The `Navigator.svelte` component within `Editor.svelte` interacts with `TodoView`'s view transition context setters when navigating (zooming).
*   **`Weekly.svelte` (`src/lib/panels/schedule/Weekly.svelte`):**
    *   Instantiates `TodoView` for each journal entry (which is a `TaskProxy`).
    *   Passes the journal's `task` and an `EditorItemState` derived from `JournalPanelState.loadChild()` as props.
*   **Context Propagation:**
    *   `TodoView.svelte` sets the initial `EditorItemState` context.
    *   `TodoList.svelte` consumes this via `getParentStateContext()`.
    *   `Todo.svelte` consumes its parent's state (from `TodoList` or another `Todo`) and sets a new context for its own `EditorItemState` (`$parentState.loadChild(task).$`) for its children, enabling hierarchical state management for folded states, paths, etc.
    *   The `panelId` context, set by `Editor.svelte` or `Weekly.svelte`, is used by drag-and-drop components (`TaskDraggable.svelte`, `TaskDropable.svelte`) to differentiate between same-panel moves and cross-panel links.