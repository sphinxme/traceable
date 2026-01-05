# Data Model: TipTap Editor 替换

**Date**: 2026-01-05
**Feature**: 002-tiptap-editor

## Task Entity

### Y.Map 结构

```typescript
interface TaskData {
  id: string                    // 任务唯一标识
  textId: string                // 文本内容 Y.Text 的 ID
  noteId: string                // 备注内容 Y.Text 的 ID (直接删除旧字段)
  nodeDoc: Y.Doc                // TipTap ProseMirror 文档
  status: 'TODO' | 'DONE' | 'BLOCKED'
  children: Y.Array<string>     // 子任务 ID 列表
  parents: Y.Array<string>      // 父任务 ID 列表
  events: Y.Array<string>       // 关联事件 ID 列表
  createdAt: number             // 创建时间戳
  updatedAt: number             // 更新时间戳
}
```

### nodeDoc (Y.Doc) 子文档结构

```
Y.Doc
├── xmlFragment                // ProseMirror 文档结构
└── (其他协作数据)
```

## NoteEditor 组件接口

### Props

```typescript
interface NoteEditorProps {
  task: TaskProxy              // 任务代理，包含 nodeDoc
  onClose?: () => void         // 关闭回调
}
```

### 导出方法

```typescript
interface NoteEditorExports {
  focus(): void                // 聚焦编辑器
}
```

## 验证规则

1. **nodeDoc 初始化**: Task 创建时自动创建新的 Y.Doc 实例
2. **nodeDoc 清理**: Task 删除时自动销毁 Y.Doc
3. **协作同步**: nodeDoc 通过 y-indexeddb 持久化 + LiveBlocks 同步