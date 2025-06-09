---
description: This detailed Week.svelte  (Calendar Panel) and described its Detailed Design and Implementation
globs: 
alwaysApply: false
---
## 1. Component Identification and Location

The core of the visual calendar/scheduling view is primarily implemented by a set of Svelte components located in `src/lib/components/calendar/views/`.

*   **Main Grid and Layout Component:** `src/lib/components/calendar/views/Week.svelte`
    *   This component is responsible for rendering the weekly calendar grid, including days, time slots, and orchestrating the display of events.
*   **Individual Event Component:** `src/lib/components/calendar/views/WeekEvent.svelte`
    *   This component renders a single event block on the calendar, handling its specific display, interaction (drag, resize), and context menu.
*   **Interaction Logic:** `src/lib/components/calendar/views/interact.svelte.ts`
    *   This TypeScript file contains Svelte actions that use `interact.js` to enable drag-and-drop functionality for creating and modifying events on the calendar grid.
*   **Utility Functions:** `src/lib/components/calendar/views/utils.svelte.ts`
    *   Provides helper functions for date calculations, percentage conversions, and other utilities specific to the calendar view.
*   **Panel Wrapper:** `src/lib/panels/calendar/Calendar.svelte`
    *   This is a higher-level component that instantiates the calendar view, typically passing in the necessary data managers like `EventProxyManager`. It then uses:
*   **Component Wrapper:** `src/lib/components/calendar/Calendar.svelte`
    *   This component acts as a simple wrapper, primarily passing the `eventProxyManager` prop to `Week.svelte`.

For this document, `Week.svelte` will be treated as the central component for the calendar grid, with `WeekEvent.svelte` and `interact.svelte.ts` as key supporting modules.

## 2. Component Responsibilities and Core Function Implementation

### 2.1. `Week.svelte`

*   **Primary Responsibilities:**
    *   Render a scrollable weekly view of the calendar.
    *   Display day columns and time slots.
    *   Fetch and display `EventProxy` instances (events) for the visible time range.
    *   Handle the creation of new events by dragging tasks from other panels (e.g., Todo Panel) onto the calendar grid.
    *   Provide drop zones for event creation and modification.
    *   Manage the layout and positioning of `WeekEvent.svelte` components.

*   **Core Function Implementation:**

    *   **Calendar Grid Rendering:**
        *   **Days:** It calculates a range of days to display (e.g., `displayDays` derived from `today` and `dayNum` props).
            ```svelte
            // src/lib/components/calendar/views/Week.svelte
            let today = dayjs().startOf("day").add(6, "hour"); // offsetByHour
            let displayDays = range(-dayNum, dayNum).map((i) => today.add(i, "day"));
            ```
        *   **Time Slots:** It renders horizontal lines and time labels for hours of the day. The vertical scale (`dayHeight`) is bound to the rendered height of the main content area.
            ```svelte
            // src/lib/components/calendar/views/Week.svelte
            // In the template for time labels:
            {#each range(1 + offsetByHour, 23 + offsetByHour) as hour}
                // ... renders hour label
            {/each}
            ```
        *   **Layout:** Uses CSS Grid for layout:
            ```html
            <!-- src/lib/components/calendar/views/Week.svelte -->
            <div class="calendar relative grid rounded-lg"
                 style:grid-template-columns="{sideWidth}rem repeat({displayDayNum}, 1fr)"
                 style:grid-template-rows="auto auto 1fr"
                 bind:offsetHeight={dayHeight}
                 <!-- ... -->
            >
            ```
        *   **Current Time Indicator:** A red line indicating the current time is updated via `requestAnimationFrame`.
            ```svelte
            // src/lib/components/calendar/views/Week.svelte
            const updateTimePosition = () => {
                const now = dayjs();
                const startOfDay = now.startOf("day").add(offsetByHour, "hour");
                const currentMilliseconds = now.diff(startOfDay);
                currentTimePercentage = (currentMilliseconds / totalMilliseconds) * 100;
            };
            const animate = () => {
                updateTimePosition();
                setTimeout(() => {
                    animationFrameId = requestAnimationFrame(animate);
                }, 10000); // Updates every 10 seconds
            };
            ```

    *   **`event` Rendering on Calendar (`WeekEvent.svelte`):**
        *   `Week.svelte` iterates over events fetched by `EventProxyManager` and renders a `WeekEvent.svelte` component for each.
            ```svelte
            // src/lib/components/calendar/views/Week.svelte
            const events = manager.queryByRange$(displayStartDay.valueOf(), displayEndDay.valueOf());
            // ...
            {#each $events as event (event.id)}
                <WeekEvent {offsetByHour} {event} {getColumnIndex} {dayHeight} <!-- ... --> />
            {/each}
            ```
        *   `WeekEvent.svelte` calculates its position and size:
            *   `topOffset`: Calculated based on the event's start time relative to the day's display start hour and `dayHeight`.
                ```typescript
                // src/lib/components/calendar/views/WeekEvent.svelte
                const calculateTopOffset2 = (start: number, dayHeight: number): number => {
                    const startOfDay = dayjs(start).add(-offsetByHour, "hour").startOf("day").add(offsetByHour, "hour");
                    const percentOfDay = percent(startOfDay.valueOf(), start); // percent from utils.svelte.ts
                    return Math.floor(percentOfDay * dayHeight);
                };
                let topOffset = $state(calculateTopOffset2($reactiveStart, dayHeight));
                ```
            *   `eventHeight`: Calculated based on the event's duration and `dayHeight`.
                ```typescript
                // src/lib/components/calendar/views/WeekEvent.svelte
                const calculateEventHeight2 = (start: number, end: number, dayHeight: number): number => {
                    return Math.floor(percent(start, end) * dayHeight); // percent from utils.svelte.ts
                };
                let eventHeight = $state(calculateEventHeight2($reactiveStart, $reactiveEnd, dayHeight));
                ```
            *   `columnIndex`: Determines which day column the event falls into.
                ```typescript
                // src/lib/components/calendar/views/WeekEvent.svelte
                let columnIndex = $state(getColumnIndex($reactiveStart)); // getColumnIndex passed from Week.svelte
                ```
        *   It displays the task's text (`event.task.text$`) and start/end times.
            ```svelte
            // src/lib/components/calendar/views/WeekEvent.svelte
            <div class="break-words pb-1 text-wrap text-ellipsis">{$text}</div>
            <div class=" text-xs pb-3 font-extralight">
                {dayjs(previewStart).format("HH:mm")} - {dayjs(previewEnd).format("HH:mm")}
            </div>
            ```

    *   **Creating `event`:**
        *   **Drag `task` from Source:**
            *   `Week.svelte` uses the `dayExternalDropZone` Svelte action from `src/lib/components/calendar/views/interact.svelte.ts` on each day cell.
                ```svelte
                // src/lib/components/calendar/views/Week.svelte
                <div use:dayExternalDropZone={{
                    onDragEnd() { draggingTaskEvent = null; },
                    onDragOver(task, topPx) { /* ... update draggingTaskEvent for preview ... */ },
                    onDrop(task, topPx) {
                        // ... calculate start time ...
                        start = roundToNearest15Minutes(start); // from utils.svelte.ts
                        task.insertEvent(start.valueOf(), start.add(30, "minutes").valueOf());
                        draggingTaskEvent = null;
                    },
                }} data-dayts={day.valueOf()}></div>
                ```
            *   `dayExternalDropZone` in `interact.svelte.ts` sets up `node.ondragover`, `node.ondragend`, `node.ondrop` native HTML5 DnD event handlers.
            *   On `drop`, it retrieves `TaskDnDData` using `getDnDData("tasks")` (from `src/lib/components/dnd/state.ts`). This data contains the `draggingTask`.
                ```typescript
                // src/lib/components/calendar/views/interact.svelte.ts
                export const dayExternalDropZone: Action<HTMLDivElement, DayExternalDropZoneParams> = (node, { onDragOver, onDragEnd, onDrop }) => {
                    // ...
                    node.ondrop = (event) => {
                        event.preventDefault();
                        const data: TaskDnDData = getDnDData("tasks"); // TaskDnDData from src/lib/components/todolist/dnd/state.ts
                        onDrop(data.draggingTask, event.offsetY);
                    };
                };
                ```
            *   The `onDrop` callback in `Week.svelte` then calls `task.insertEvent(start, end)` on the dropped `TaskProxy`. This method on `TaskProxy` (`src/lib/states/meta/task.svelte.ts`) creates a new `EventProxy` via `EventProxyManager` and links it.
                ```typescript
                // src/lib/states/meta/task.svelte.ts (TaskProxy class)
                public insertEvent(start: number, end: number) {
                    const event = this.manager.eventproxyManager.createEvent(this, start, end);
                    this.events._attach(event.id); // _attach is on YIterable, adds to Y.Array
                    return event;
                }
                ```
        *   **Direct Calendar Creation (Click/Drag Selection):** This functionality does not appear to be implemented. Event creation is primarily through dragging existing tasks.

    *   **Modifying `event` (Drag/Resize):**
        *   Handled by `WeekEvent.svelte` using `interact.js` via the `interactAction` (aliased as `interact`) from `src/lib/components/calendar/views/interact.svelte.ts`.
            ```svelte
            // src/lib/components/calendar/views/WeekEvent.svelte
            // onMount:
            interact(container)
                .resizable({ /* ... listeners ... */ })
                .draggable({ /* ... listeners ... */ });
            ```
        *   **Dragging to Move:**
            *   The `draggable` listener's `move` event updates `previewStart` and `previewEnd` for visual feedback.
                ```typescript
                // src/lib/components/calendar/views/WeekEvent.svelte
                // draggable listener:
                move(dragEvent) {
                    // ... calculate columnIndex, topOffset from dragEvent.dy and dropzone ...
                    previewStart = (topOffset / dayHeight) * 24 * 60 * 60 * 1000 + targetDayStartTs;
                    previewEnd = previewStart + preDuration;
                }
                ```
            *   The `end` event calls `event.moveTo(newStartTime)` on the `EventProxy`.
                ```typescript
                // src/lib/components/calendar/views/WeekEvent.svelte
                // draggable listener:
                end(dragEvent) {
                    // ... calculate startTemp from final topOffset and targetDayTs ...
                    event.moveTo(startTemp); // This updates Yjs Map for the event
                }
                ```
                ```typescript
                // src/lib/states/meta/event.svelte.ts (EventProxy class)
                public moveTo(start: number) {
                    if (start === this.start) return;
                    const duration = this.end - this.start;
                    this.setPeriod(start, start + duration); // setPeriod calls this.data.set("start", ...) and this.data.set("end", ...)
                }
                ```
        *   **Resizing:**
            *   The `resizable` listener's `move` event updates `eventHeight` and `previewEnd`.
            *   The `end` event calls `event.resizeTo(newDuration)` on the `EventProxy`.
                ```typescript
                // src/lib/components/calendar/views/WeekEvent.svelte
                // resizable listener:
                end(dragEvent) {
                    const duration = (24 * 60 * 60 * 1000 * eventHeight) / dayHeight;
                    event.resizeTo(duration); // This updates Yjs Map for the event's end time
                }
                ```
                ```typescript
                // src/lib/states/meta/event.svelte.ts (EventProxy class)
                public resizeTo(duration: number) {
                    const newEnd = this.start + duration;
                    this.end = newEnd; // this.data.set("end", value);
                }
                ```

    *   **Deleting `event`:**
        *   `WeekEvent.svelte` includes a `ContextMenu.Root` that provides a "删除" (Delete) option.
            ```svelte
            // src/lib/components/calendar/views/WeekEvent.svelte
            <ContextMenu.Item onclick={() => event.destory()}>删除</ContextMenu.Item>
            ```
        *   Clicking this calls `event.destory()` on the `EventProxy`.
            ```typescript
            // src/lib/states/meta/event.svelte.ts (EventProxy class)
            public destory() {
                this.data.doc?.transact(() => {
                    this.task.detachEvent(this.id); // Removes eventId from task.events Y.Array
                    this.manager.delete(this.id);   // Deletes event Y.Map from repository.events
                })
            }
            ```

    *   **Maintaining `event` and `task` Association:**
        *   When an event is created from a task, `task.insertEvent()` adds the new event's ID to the task's `events` Y.Array and the event's Y.Map stores the `taskId`.
        *   When an event is deleted, `event.destory()` calls `this.task.detachEvent(this.id)` which removes the event ID from the task's `events` Y.Array.

### 2.2. `WeekEvent.svelte`

*   **Primary Responsibilities:**
    *   Render a single event block.
    *   Display event details (task name, time, parent tasks in tooltip).
    *   Handle drag-to-move and drag-to-resize interactions for itself using `interact.js`.
    *   Provide a context menu for actions like deletion.
    *   Provide a tooltip for more detailed information.

*   **Core Function Implementation (covered above in conjunction with `Week.svelte`)**

## 3. Data Interaction and State Management (Yjs)

*   **Fetching and Subscribing:**
    *   `Week.svelte` receives the `EventProxyManager` as a prop (`manager`).
    *   It uses `manager.queryByRange$(startTs, endTs)` to get an RxJS `Observable` of events within the current view's time range. Svelte's `$` auto-subscription syntax is used to react to changes.
        ```svelte
        // src/lib/components/calendar/views/Week.svelte
        const events = manager.queryByRange$(displayStartDay.valueOf(), displayEndDay.valueOf());
        // In template:
        {#each $events as event (event.id)}
        ```
    *   `WeekEvent.svelte` receives an `EventProxy` instance (`event`) and its associated `TaskProxy` (`task`). It subscribes to observables from these proxies for reactive updates (e.g., `event.start$`, `task.text$`).
        ```svelte
        // src/lib/components/calendar/views/WeekEvent.svelte
        const reactiveStart = event.start$;
        const reactiveEnd = event.end$;
        const text = task.text$;
        ```

*   **Triggering Yjs Updates:**
    *   User interactions (drag, resize, delete in `WeekEvent.svelte`, drop in `Week.svelte`) call methods on `EventProxy` or `TaskProxy` instances (e.g., `event.moveTo()`, `task.insertEvent()`, `event.destory()`).
    *   These proxy methods internally modify Yjs shared types (`Y.Map` for event data, `Y.Array` for task's event list). For example:
        ```typescript
        // src/lib/states/meta/event.svelte.ts (EventProxy class, set end example)
        public set end(value: number) {
            if (value === this.end) return;
            this.data.set("end", value); // 'data' is the Y.Map for this event
        }
        ```
    *   All modifications are typically wrapped in `this.data.doc?.transact(() => { ... })` by the proxy methods or their callers to ensure atomicity.

*   **Responding to External Yjs Changes:**
    *   Since Svelte components subscribe to RxJS observables derived from Yjs types (e.g., `event.start$`, `manager.queryByRange$`), any change to the underlying Yjs data (whether from the current client or a remote client via Liveblocks) will trigger an emission from the observable.
    *   Svelte's reactivity system (`$`, `$derived`, `$effect`) automatically re-renders the relevant parts of the component tree when these observables emit new values.
        ```svelte
        // src/lib/components/calendar/views/WeekEvent.svelte
        // This $effect will re-run if $reactiveStart, $reactiveEnd, or dayHeight changes
        $effect(() => {
            topOffset = calculateTopOffset2($reactiveStart, dayHeight);
            eventHeight = calculateEventHeight2($reactiveStart, $reactiveEnd, dayHeight);
            columnIndex = getColumnIndex($reactiveStart);
            previewStart = $reactiveStart;
            previewEnd = $reactiveEnd;
        });
        ```

## 4. Svelte API Usage

*   **`Week.svelte`:**
    *   **Props:**
        *   `dayNum?: number = 10`: Number of days to show before/after today.
        *   `manager: EventProxyManager`: The manager for event data.
    *   **Runes:** Uses `$state` for local reactive variables (e.g., `dayHeight`, `draggingTaskEvent`), `$derived.by` for complex derivations (e.g. `snapsOffset`), and `$effect` for side effects.
    *   **Context:** None directly set or consumed, but relies on `EventProxyManager` passed via props.
    *   **Slots:** None.

*   **`WeekEvent.svelte`:**
    *   **Props:**
        *   `dayHeight: number`
        *   `dayWidth: number`
        *   `event: EventProxy`
        *   `task: TaskProxy`
        *   `offsetByHour: number`
        *   `snapsOffset: number[]`
        *   `getColumnIndex: (t: number) => number`
    *   **Runes:** Extensively uses `$state`, `$derived`, and `$effect` for managing its position, size, and reacting to data changes.
    *   **Context:** None.
    *   **Slots:** None.

*   **`interact.svelte.ts` (Actions):**
    *   `dayDropZone: Action<HTMLDivElement>`
    *   `dayExternalDropZone: Action<HTMLDivElement, DayExternalDropZoneParams>`
    *   `interactAction: Action<HTMLDivElement, ResizeActionParams>` (aliased as `interact`)
    *   These actions encapsulate `interact.js` setup and listeners.

## 5. Key Interaction Logic

*   **Drag and Drop (DnD):**
    *   **Creating events by dragging tasks:**
        *   Uses native HTML5 DnD API. `TaskDraggable.svelte` (in todolist) sets up `ondragstart` and uses `event.dataTransfer.setDragImage`.
        *   `Week.svelte` day cells use the `dayExternalDropZone` action, which sets up `ondragover`, `ondrop`.
        *   Data Transfer: `setDnDData(channel, data)` and `getDnDData(channel)` from `src/lib/components/dnd/state.ts` are used to pass `TaskDnDData` (defined in `src/lib/components/todolist/dnd/state.ts`) which includes the `draggingTask: TaskProxy`.
    *   **Modifying existing events (move/resize):**
        *   Uses `interact.js` library, configured within `WeekEvent.svelte` via the Svelte action imported from `src/lib/components/calendar/views/interact.svelte.ts`.
        *   `interact(node).draggable({ listeners: { start, move, end } })`
        *   `interact(node).resizable({ listeners: { start, move, end } })`
        *   The `move` listeners update local `$state` variables (`topOffset`, `eventHeight`, `previewStart`, `previewEnd`) for immediate visual feedback.
        *   The `end` listeners commit changes to Yjs by calling methods on the `EventProxy` (e.g., `event.moveTo()`, `event.resizeTo()`).
    *   **Snapping:**
        *   During drag-move of an event in `WeekEvent.svelte`, `topOffset` is snapped to the nearest 15-minute interval using `roundToNearest15Minutes(snapsOffset, realTopOffset)`. `snapsOffset` is a `$derived` array of pixel offsets for each 15-min mark.
        *   When dropping a task to create an event in `Week.svelte`, the calculated start time is rounded using `roundToNearest15Minutes(start)` from `src/lib/components/calendar/views/utils.svelte.ts`.

*   **Data Consistency:**
    *   **Yjs Transactions:** Critical operations that modify multiple Yjs objects (e.g., deleting an event, which modifies the event Y.Map and the task's `events` Y.Array) are wrapped in `doc.transact(() => { ... })` within the proxy methods (e.g., `EventProxy.destory()`). This ensures atomicity.
    *   **Single Source of Truth:** All data comes from Yjs via the `EventProxyManager` and `EventProxy`/`TaskProxy` observables. UI actions modify this data via Yjs, and the UI reactively updates. This inherently keeps data synchronized.
    *   **Linking:** Event creation (`TaskProxy.insertEvent`) ensures the `eventId` is added to `task.events` and `taskId` is stored in the event's Y.Map. Deletion (`EventProxy.destory`) performs the reverse.

## 6. Interaction with Other Components/Views

*   **Receiving Dragged `task` Data from Todo Panel:**
    *   **Data Source:** `TaskDraggable.svelte` in the todolist initiates the drag. Its `onDragStart` callback prepares `TaskDnDData`.
        ```typescript
        // src/lib/components/todolist/dnd/TaskDraggable.svelte
        onDragStart() {
            // ...
            return {
                originPanelId: panelId,
                draggingTask: task, // This is a TaskProxy
                originParentTask: parent,
            };
        }
        ```
    *   **Data Channel:** The `draggable` action uses `setDnDData("tasks", data)` (from `src/lib/components/dnd/state.ts`).
    *   **Data Consumption:** `Week.svelte` (via `dayExternalDropZone` action) uses `getDnDData("tasks")` to retrieve this `TaskDnDData` on drop. The `draggingTask` (a `TaskProxy`) is then used to create the new event.
*   **Global Signals/Stores:**
    *   `highlightTaskSignal` from `src/lib/states/signals.svelte.ts`: `WeekEvent.svelte` emits on this signal when an event is tapped, allowing other parts of the application (like the Todo panel) to highlight the associated task.
        ```svelte
        // src/lib/components/calendar/views/WeekEvent.svelte
        .on("tap", (e) => {
            clickCount++;
            highlightTaskSignal.next({ id: task.id, index: clickCount });
        });
        ```
    *   `highlightFEventIds` and `foucsingEventIds` from `src/lib/states/stores.svelte.ts`: These are Svelte 5 runes (`$state`) used for global state to coordinate highlighting/focusing of events between the calendar and potentially other UI elements (like event indicators on tasks in the todolist). `WeekEvent.svelte` reads these to apply visual styles or scroll into view.
        ```svelte
        // src/lib/components/calendar/views/WeekEvent.svelte
        const highlight = $derived(highlightFEventIds[event.id]);
        const focusMe = $derived(foucsingEventIds[event.id] || false);
        $effect(() => { if (focusMe) { /* scroll into view */ } });
        ```
        `EventIndicator.svelte` (used in TodoItem) sets `highlightFEventIds` on hover.