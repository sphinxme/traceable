# Data Model: Remove RxDB Residual Code

**Branch**: `001-remove-rxdb` | **Date**: 2025-12-31

## Overview

This feature does not introduce any new data model changes. It is a maintenance task to remove unused dependencies.

## Existing Data Model (Unchanged)

The project uses Yjs as the single source of truth for all application state. No data model changes are required for this feature.

### Task Entity (Y.Map)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique task identifier |
| textId | string | Reference to Y.Text content |
| noteId | string | Reference to Y.Text note content |
| status | enum | TODO, DONE, or BLOCKED |
| children | Y.Array<string> | IDs of child tasks (multi-parent support) |
| parents | Y.Array<string> | IDs of parent tasks |
| events | Y.Array<string> | IDs of linked events |

### Event Entity (Y.Map)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique event identifier |
| taskId | string | Reference to parent task |
| textId | string | Reference to Y.Text content |
| start | number | Start timestamp |
| end | number | End timestamp |

### Text Content (Y.Text)

Collaborative text data for task content and notes, edited via Quill editor.

---

## Migration Notes

No data migration is required. This feature only removes the RxDB package reference; the actual Yjs-based data model remains unchanged.