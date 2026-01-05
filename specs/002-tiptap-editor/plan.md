# Implementation Plan: TipTap Editor 替换

**Branch**: `002-tiptap-editor` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)

## Summary

将 NoteEditor 组件中的 Quill 富文本编辑器替换为 TipTap 编辑器，同时保持与 Yjs Y.Text 的实时协作绑定。核心功能包括纯文本输入、Shift+Enter 关闭编辑器、焦点管理，以及正确的资源清理。

## Technical Context

**Language/Version**: TypeScript 5.6, Svelte 5, Deno 2.x
**Package Manager**: Deno
**Primary Dependencies**:
- `@tiptap/core` - TipTap 核心编辑器
- `@tiptap/pm` - ProseMirror 依赖
- `y-prosemirror` - Yjs 与 ProseMirror 绑定
- `@tiptap/extension-collaboration` - 协作编辑扩展
- `@tiptap/starter-kit` - 基础扩展包
**Storage**: Yjs Y.Doc (通过 y-indexeddb 持久化)
**Testing**: Vitest + Testing Library
**Target Platform**: Desktop (Tauri 2.8) + Web
**Project Type**: Single Svelte 5 项目
**Performance Goals**: 编辑器加载 <1s, 协作同步 <500ms
**Constraints**: 纯文本模式无工具栏，需保留 Shift+Enter 快捷键
**Scale/Scope**: 替换现有 Quill 编辑器，影响 NoteEditor 组件

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| I. Yjs as Single Source of Truth | ✅ PASS | 使用 Y.Text 作为协作数据源，TipTap 通过 y-prosemirror 绑定 |
| II. RxJS Reactive Bridge Layer | ✅ PASS | Yjs 状态变更通过现有 RxJS bridge 暴露给 Svelte |
| III. Task-Event Dual View Architecture | N/A | 此功能不涉及 dual view 变更 |
| IV. Multi-Parent Task Support | N/A | 此功能不涉及 Task 关系变更 |
| V. Offline-First with IndexedDB | ✅ PASS | 复用现有 y-indexeddb 持久化 |

## Project Structure

### Documentation (this feature)

```text
specs/002-tiptap-editor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── components/
│       └── todolist/
│           └── NoteEditor.svelte    # 替换 Quill 为 TipTap
```

```text
tests/
└── unit/
    └── note-editor.spec.ts          # 编辑器测试
```

**Structure Decision**: 单项目结构，NoteEditor.svelte 组件替换为 TipTap 实现，复用现有 Yjs 集成基础设施。

## Complexity Tracking

> 无 Constitution 违规