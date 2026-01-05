# Implementation Plan: Remove RxDB Residual Code

**Branch**: `001-remove-rxdb` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-remove-rxdb/spec.md`

## Summary

移除项目依赖配置中所有 RxDB 相关的引用，包括 package.json 中的依赖项、deno.lock 文件中的锁定信息以及 trustedDependencies 配置。RxDB 已在上一版本中被 Yjs + y-indexeddb 替代，源代码中已无实际使用，需要清理这些残余依赖以减少项目体积和维护负担。

## Technical Context

**Language/Version**: TypeScript 5.6, Svelte 5
**Primary Dependencies**: Svelte 5, Vite 7, Yjs 13.6, LiveBlocks 2.11, RxJS 7.8, Tauri 2.8
**Storage**: y-indexeddb 9.0 (Offline-first via IndexedDB)
**Testing**: svelte-check, tsc - 类型检查
**Target Platform**: Tauri Desktop Application
**Project Type**: Desktop/Web 应用 (Vite + Svelte)
**Performance Goals**: 平滑的用户界面，稳定的实时协作编辑
**Constraints**: 必须保持 Yjs 作为唯一数据源，确保 offline-first 兼容性
**Scale/Scope**: 代码库约 10-50 个组件/状态文件，目标个人/小团队使用

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Compliance Analysis

| Principle | Status | Notes |
|-----------|--------|-------|
| Yjs as Single Source of Truth | ✅ PASS | 没有违反 - RxDB 移除后仅 Yjs 作为数据源 |
| RxJS Reactive Bridge Layer | ✅ PASS | 没有违反 - RxJS 继续作为 Svelte ↔ Yjs 的桥梁 |
| Task-Event Dual View Architecture | ✅ PASS | 没有违反 - 不影响现有数据模型 |
| Multi-Parent Task Support | ✅ PASS | 没有违反 - 不影响 Task/Event 关系 |
| Offline-First with IndexedDB Persistence | ✅ PASS | 没有违反 - y-indexeddb 继续作为持久化层 |

### Gate Status

**✅ PASSED** - This feature aligns with the constitution. Removing RxDB residiual code actually strengthens the "Yjs as Single Source of Truth" principle by eliminating a deprecated alternative data store.

## Project Structure

### Documentation (this feature)

```text
specs/001-remove-rxdb/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A - no new data model)
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (N/A - no API contracts)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
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

deno.lock                  # Will be regenerated during implementation

package.json               # Will be modified to remove RxDB references
```

**Structure Decision**: 默认的单项目结构，使用 Vite 作为构建工具。修改仅影响配置文件，不影响源代码目录结构。

## Complexity Tracking

> No violations - this section is not applicable as the feature PASSED all constitution checks.