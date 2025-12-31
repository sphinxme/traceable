<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- New constitution - Initial ratification
- Added sections: Core Principles (5 principles), Technology Stack, Architecture, Governance
- Templates requiring updates: ✅ All templates reviewed and aligned
- Follow-up TODOs: None
-->

# Traceable Constitution

## Core Principles

### I. Yjs as Single Source of Truth

Yjs MUST serve as the exclusive source of truth for all application state. All data operations MUST flow through Yjs data structures (Y.Map, Y.Array, Y.Text). RxDB has been deprecated and MUST NOT be used for any new features or data persistence. This ensures consistent, conflict-free collaborative editing across all clients.

**Rationale**: Eliminates dual source-of-truth complexity, ensures reliable synchronization via LiveBlocks, and simplifies state management architecture.

### II. RxJS Reactive Bridge Layer

RxJS is used as the reactive bridge between Svelte 5 and Yjs. Yjs state changes are exposed through RxJS Observables via proxy classes (TaskProxy, EventProxy, etc.), which Svelte components consume. When modifying this pattern, consider whether alternatives maintain the same level of reactivity between Yjs changes and UI updates.

**Rationale**: RxJS provides a proven pattern for bridging Yjs observation patterns with Svelte 5's reactive system, enabling efficient subscription management and change propagation. This approach should be maintained unless a compelling alternative is identified.

### III. Task-Event Dual View Architecture

The application MUST maintain two synchronized views: (1) Infinite nested outline (类似Workflowy/幕布) where each item is a Task, and (2) Calendar week view where Event blocks represent scheduled time. Tasks and Events MUST be bidirectionally linked - each Task can have 0+ Events, each Event references 1 Task. All operations MUST reflect in both views in real-time.

**Rationale**: Users need both hierarchical task organization and visual time management; the dual-view approach provides context switching while maintaining data consistency.

### IV. Multi-Parent Task Support

A Task MUST support multiple parent Tasks (many-to-many relationship in the outline). Deleting a Task from one parent MUST NOT delete it if other parents exist. A Task is only fully deleted when it has no remaining parents. The TaskProxy.children and TaskProxy.parents arrays MUST always remain synchronized.

**Rationale**: Enables flexible task organization where a single task can belong to multiple contexts/projects without duplication.

### V. Offline-First with IndexedDB Persistence

The application MUST support offline-first functionality using y-indexeddb for local persistence. All Yjs changes MUST be persisted locally and synchronized when connectivity is restored via LiveBlocks. Local storage MUST NOT be accessed directly for application state.

**Rationale**: Ensures reliability and usability regardless of network conditions, with automatic conflict resolution through CRDT.

## Technology Stack

**Frontend Framework**: Svelte 5 + TypeScript 5.6
**Build Tool**: Vite 7.0
**Real-time Sync**: Yjs 13.6 + LiveBlocks 2.11
**Reactive Bridge**: RxJS 7.8
**Local Persistence**: y-indexeddb 9.0
**Desktop Platform**: Tauri 2.8
**UI Components**: bits-ui (Radix UI for Svelte) + shadcn-svelte
**Styling**: Tailwind CSS 3.4
**Rich Text**: Quill 2.0 + y-quill
**Date Handling**: dayjs 1.11

## Architecture

### Data Model

- **Task**: Y.Map containing id, textId, noteId, status (DONE/TODO/BLOCKED), children (Y.Array<string>), parents (Y.Array<string>), events (Y.Array<string>)
- **Event**: Y.Map containing id, taskId, textId, start (timestamp), end (timestamp)
- **Text Content**: Y.Text for task text and notes (collaborative editing)

### Proxy Layer

- **TaskProxyManager**: Factory for TaskProxy instances, manages caching
- **TaskProxy**: Wraps Y.Map task data, exposes RxJS Observables ($ suffix), provides CRUD operations
- **EventProxyManager**: Factory for EventProxy instances, supports range queries
- **EventProxy**: Wraps Y.Map event data, provides time-based operations (moveTo, resizeTo)

### Directory Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── todolist/     # Outline view components
│   │   ├── calendar/     # Calendar view components
│   │   └── ui/           # Shared UI components
│   ├── states/
│   │   ├── meta/         # Data models (task.svelte.ts, event.svelte.ts)
│   │   ├── yjs/          # Yjs repository and loading
│   │   └── stores.svelte.ts
│   └── panels/           # Panel controllers
└── main.ts
```

## Governance

### Amendment Process

Constitution amendments require:
1. Documentation of the proposed change with rationale
2. Review of impact on existing features and templates
3. Version bump according to semantic versioning (MAJOR for breaking changes, MINOR for additions, PATCH for clarifications)
4. Propagation of changes to all dependent templates (spec-template.md, plan-template.md, tasks-template.md)

### Compliance Review

All feature specifications and implementation plans MUST:
- Verify adherence to Yjs-as-SSOT principle (no direct database access)
- Confirm reactive state patterns properly bridge Yjs changes to UI updates
- Ensure dual-view consistency for Task/Event operations
- Validate multi-parent task handling in deletion scenarios
- Confirm offline-first compatibility

### Complexity Justification

Any deviation from these principles (e.g., adding a new state management layer) MUST be documented with:
- The specific problem being solved
- Why existing patterns are insufficient
- Simpler alternatives considered and rejected

**Version**: 1.0.1 | **Ratified**: 2025-12-31 | **Last Amended**: 2025-12-31
