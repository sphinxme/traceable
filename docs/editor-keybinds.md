---
description: To document TodoItem in TodoEditor keyboard shortcuts & interactions: text editing, creation, indent/outdent.
globs: 
alwaysApply: false
---
1.  **Introduction**
    *   Purpose: To document the keyboard shortcuts and interactions available within a `TodoItem` component, focusing on text editing, item creation, and hierarchical manipulation (indent/outdent).
    *   Scope: Primarily `TodoItem.svelte` and its interaction with handlers provided by `Todo.svelte` and `TodoList.svelte`.
    *   Core Technology: Quill editor for text input, custom keyboard bindings.

2.  **Core Mechanism: Quill Editor and Custom Bindings**
    *   Quill Initialization in `TodoItem.svelte`:
        *   Use of `new Quill(container, {...})`.
        *   Standard modules (e.g., `toolbar: false`).
        *   Theme (`bubble`).
    *   Registering Custom Keybindings:
        *   `editor.keyboard.addBinding({...})` for new keys.
        *   `editor.keyboard.bindings["KEY"].unshift({...})` to override or prepend to existing Quill handlers.
        *   Use of `warpKeyHandler` (from `src/lib/components/quill/model.ts`) to standardize handler signature (`range, context, quill`).
    *   Handler Propagation:
        *   Some handlers are local to `TodoItem.svelte` (e.g., Shift+Enter for notes).
        *   Most structural and navigational handlers (`enterHandle`, `arrowUpHandle`, `arrowDownHandle`, `tabHandle`, `untabHandle`) are passed as props from `Todo.svelte`.

3.  **Detailed Keyboard Operations**

    *   **3.1. Enter Key**
        *   **User Action:** Pressing `Enter`.
        *   **Handler Prop (from `Todo.svelte`):** `enterHandle` (in `TodoItem.svelte`), which maps to `itemEnterHandler` in `Todo.svelte`.
        *   **Expected Behavior & Implementation (logic within `itemEnterHandler` in `Todo.svelte`):**
            *   **Case 1: Cursor in middle of text (text split):**
                *   `context.prefix` (text before cursor) becomes content of a new sibling item inserted *before* the current item.
                *   `context.suffix` (text after cursor) remains in the current item (Quill handles this by default if the handler returns true, but here it's `quill.setText(context.suffix)`).
                *   Calls `insertBeforeMyself(context.prefix)` prop (from `Todo.svelte`, ultimately `TodoList.svelte`).
                *   Focus typically remains on the current item (now containing the suffix), or might move to the newly created item depending on exact `insertBeforeMyself` implementation details.
            *   **Case 2: Cursor at end of text, no children, or item is folded:**
                *   A new empty sibling item is created *after* the current item.
                *   Calls `insertAfterMyself("")` prop (from `Todo.svelte`, ultimately `TodoList.svelte`).
                *   Focus moves to the new empty item.
            *   **Case 3: Cursor at end of text, item has visible children (not folded):**
                *   A new empty item is created as the *first child* of the current item.
                *   Calls `todoList.insertItem(0, "")` (referencing the child `TodoList` component).
                *   Focus moves to the new empty child item.
        *   **Relevant Files:**
            *   `src/lib/components/todolist/item/TodoItem.svelte` (receives and binds `enterHandle`)
            *   `src/lib/components/todolist/Todo.svelte` (defines `itemEnterHandler` and passes `insertBeforeMyself`, `insertAfterMyself`)
            *   `src/lib/components/todolist/TodoList.svelte` (implements `insertItem` which calls `parent.insertChild`)
            *   `src/lib/states/meta/task.svelte.ts` (`TaskProxy.insertChild`)

    *   **3.2. Shift + Enter Key**
        *   **User Action:** Pressing `Shift + Enter`.
        *   **Handler (local to `TodoItem.svelte`):** `shiftEnterHandle`.
        *   **Expected Behavior & Implementation:**
            *   Opens the note editor for the current task.
            *   Sets `isNoteEditOpen = true;`.
            *   Focus transfers to the `NoteEditor.svelte` component.
        *   **Relevant Files:**
            *   `src/lib/components/todolist/item/TodoItem.svelte`
            *   `src/lib/components/todolist/item/note/NoteEditor.svelte`

    *   **3.3. Tab Key (Indent)**
        *   **User Action:** Pressing `Tab`.
        *   **Handler Prop (from `Todo.svelte`):** `tabHandle`.
        *   **Expected Behavior & Implementation (logic within `tabHandle` prop passed to `Todo.svelte`):**
            *   The current item becomes a child of the *previous sibling* item.
            *   If there's no previous sibling, the action might be disallowed or have no effect.
            *   In `Todo.svelte`, `tabHandle(task, $itemState, range.index)` is called.
            *   The `tabHandle` prop on `Todo.svelte` is passed from `TodoList.svelte`, where the core logic resides:
                *   `parent.detachChild(child)`: Current task is removed from its original parent's children list.
                *   `getIndexedItem(i - 1)?.moveInto(Number.MAX_SAFE_INTEGER, child, childState, cursorIndex)`: The task is then added as a child to the previous sibling. `childState` (the `EditorItemState` of the item being moved) is also moved in the `foldStatesTree`.
            *   Focus typically remains on the item, now indented.
        *   **Data Model Impact:**
            *   `TaskProxy`: `parents` array of the moved task is updated; `children` array of the old parent and new parent are updated.
            *   `EditorItemState`: The `foldStatesTree` in `panel_states.ts` is updated to reflect the new hierarchy for UI state (folding). `childState.parentState?.remove(childState)` and `this.foldStatesTree.set(childState.task.id, copied)`.
        *   **Relevant Files:**
            *   `src/lib/components/todolist/item/TodoItem.svelte` (binds `tabHandle`)
            *   `src/lib/components/todolist/Todo.svelte` (passes `tabHandle` call through)
            *   `src/lib/components/todolist/TodoList.svelte` (defines the logic for indenting)
            *   `src/lib/states/meta/task.svelte.ts` (`TaskProxy.attachChild`, `TaskProxy.detachChild`)
            *   `src/lib/states/states/panel_states.ts` (`EditorItemState.moveInto`, `EditorItemState.remove`)

    *   **3.4. Shift + Tab Key (Outdent)**
        *   **User Action:** Pressing `Shift + Tab`.
        *   **Handler Prop (from `Todo.svelte`):** `untabHandle`.
        *   **Expected Behavior & Implementation (logic within `untabHandle` prop passed to `Todo.svelte`):**
            *   The current item moves up one level in the hierarchy, becoming a sibling of its current parent.
            *   If the item is already at the root level of the current view (i.e., `depth === 0` as checked in `TodoList.svelte`'s `untabHandle`), the action might be disallowed or have no effect.
            *   In `Todo.svelte`, `untabHandle(task, $itemState, range.index)` is called.
            *   The `untabHandle` prop on `Todo.svelte` is passed from `TodoList.svelte`. The logic:
                *   It calls the `moveUp(child, childState, cursorIndex)` prop. This `moveUp` is actually the `movedUp` prop passed to `Todo.svelte` from its parent `TodoList.svelte`.
                *   The `movedUp` on `Todo.svelte` (which is `TodoList.moveInto` for its parent) effectively makes the current `task` a sibling of its *current parent*, inserted after it.
                *   `parent.detachChild(child)`: Current task is removed from its original parent's children list.
            *   Focus typically remains on the item, now outdented.
        *   **Data Model Impact:**
            *   `TaskProxy`: `parents` array of the moved task is updated; `children` array of the old parent and new parent (grandparent) are updated.
            *   `EditorItemState`: `foldStatesTree` is updated.
        *   **Relevant Files:**
            *   `src/lib/components/todolist/item/TodoItem.svelte` (binds `untabHandle`)
            *   `src/lib/components/todolist/Todo.svelte` (passes `untabHandle` call, receives `movedUp` prop)
            *   `src/lib/components/todolist/TodoList.svelte` (defines logic for outdenting, calls `moveUp` prop which is its parent's `moveInto`)
            *   `src/lib/states/meta/task.svelte.ts` (`TaskProxy.attachChild`, `TaskProxy.detachChild`)
            *   `src/lib/states/states/panel_states.ts`

    *   **3.5. Arrow Up Key**
        *   **User Action:** Pressing `ArrowUp`.
        *   **Handler Prop (from `Todo.svelte`):** `arrowUpHandle`.
        *   **Expected Behavior & Implementation (logic within `arrowUpHandle` prop passed to `Todo.svelte`):**
            *   **Case 1: Cursor not at the beginning of the text OR previous sibling exists:**
                *   Quill's default behavior (move cursor up within the text) OR
                *   Focus moves to the *last line/end of text* of the previous sibling `TodoItem`.
                *   Logic in `Todo.svelte`: `getIndexedItem(preIndex)?.focusBottom(range.index);`
            *   **Case 2: Cursor at the beginning of the text AND it's the first item in its list:**
                *   Focus moves to the parent element (e.g., the `Title.svelte` component if it's a root list, or the parent `TodoItem.svelte`'s text editor).
                *   This is handled by the `arrowUpHandle` passed to `TodoList.svelte` which might call `title?.focus(range.index);` (in `TodoView.svelte`) or `todoItem.focus(range.index)` (in `Todo.svelte` for nested lists).
        *   **Relevant Files:**
            *   `src/lib/components/todolist/item/TodoItem.svelte`
            *   `src/lib/components/todolist/Todo.svelte`
            *   `src/lib/components/todolist/TodoList.svelte`
            *   `src/lib/components/todolist/TodoView.svelte` (for top-level list interaction with Title)

    *   **3.6. Arrow Down Key**
        *   **User Action:** Pressing `ArrowDown`.
        *   **Handler Prop (from `Todo.svelte`):** `arrowDownHandle`.
        *   **Expected Behavior & Implementation (logic within `itemArrowDownHandle` in `Todo.svelte` and `arrowDownHandle` prop from `TodoList.svelte`):**
            *   **Case 1: Cursor not at the end of the text:**
                *   Quill's default behavior (move cursor down within the text).
            *   **Case 2: Cursor at the end of the text AND item has visible children (not folded):**
                *   Focus moves to the *first child item's text beginning*.
                *   Logic in `Todo.svelte`: `todoList.focusTop(range.index);`
            *   **Case 3: Cursor at the end of the text AND (item has no children OR item is folded) AND next sibling exists:**
                *   Focus moves to the *beginning of text* of the next sibling `TodoItem`.
                *   Logic in `Todo.svelte`: `getIndexedItem(nextIndex)?.focus(range.index);`
            *   **Case 4: Cursor at the end of the text AND it's the last item in its list (no next sibling or children to go to):**
                *   The `arrowDownHandle` passed from `TodoList.svelte` will be invoked. This might propagate further up or do nothing if at the very end.
        *   **Relevant Files:**
            *   `src/lib/components/todolist/item/TodoItem.svelte`
            *   `src/lib/components/todolist/Todo.svelte`
            *   `src/lib/components/todolist/TodoList.svelte`

4.  **Contextual State (`EditorItemState`)**
    *   Role of `$itemState` (from `src/lib/states/states/panel_states.ts`) in determining behavior:
        *   `$itemState.folded`: Affects Enter key behavior and Arrow Down navigation.
        *   `$itemState.depth` (via `parentState.depth` in `TodoList.svelte`): Used by Shift+Tab to determine if outdenting is possible.
        *   `$itemState.task.id`: Used for identity.

5.  **Data Persistence**
    *   All structural changes (indent, outdent, item creation/deletion) are operations on `TaskProxy` instances.
    *   `TaskProxy` methods modify Yjs data structures (`Y.Array` for children/parents).
    *   Yjs ensures changes are persisted locally (IndexedDB) and synchronized (Liveblocks).