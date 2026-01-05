# Research: TipTap Editor 替换

**Date**: 2026-01-05
**Feature**: 002-tiptap-editor
**Source**: Context7 TipTap 文档 (/ueberdosis/tiptap-docs)

## 数据模型变更

### 决策: Task 新增 nodeDoc (Y.Doc) 子文档

```
Decision: Task 中新增 nodeDoc 字段存储 Y.Doc 实例
Rationale: 每个 Task 拥有独立的 Y.Doc 用于 TipTap 协作编辑
Alternatives considered:
  - 使用共享 Y.Doc: 粒度太粗，多个任务冲突风险
  - 使用 Y.Text: 只能存储文本，丢失 ProseMirror 文档结构
```

### 数据结构

```
Task (Y.Map)
├── id: string
├── textId: string
├── noteId: string      ← 删除旧字段: (但是无需考虑旧数据迁移问题, 仅考虑全新使用场景)
├── nodeDoc: Y.Doc      ← 新增: TipTap 文档
├── status: 'TODO' | 'DONE' | 'BLOCKED'
├── children: Y.Array<string>
├── parents: Y.Array<string>
└── events: Y.Array<string>
```

## TipTap 与 Y.Doc 绑定

### 协作编辑配置

```typescript
import { Editor } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'

const editor = new Editor({
  extensions: [
    Collaboration.configure({
      document: task.nodeDoc, // Y.Doc 实例
    }),
  ],
})
```

### 同步流程

```
用户输入 → TipTap → ProseMirror → y-prosemirror → nodeDoc (Y.Doc)
                                    ↓
                          y-indexeddb 持久化
                                    ↓
                            LiveBlocks 同步
```

## Svelte 集成

### 决策: 使用 Svelte 5 runes 状态管理

```svelte
<script>
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import Collaboration from '@tiptap/extension-collaboration'

  let { task } = $props() // TaskProxy 传入

  let element = $state()
  let editor = $state(null)

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
        }),
        Collaboration.configure({
          document: task.nodeDoc,
        }),
      ],
      onTransaction: () => {
        editor = editor // 触发响应式更新
      },
    })
  })

  onDestroy(() => {
    editor?.destroy()
  })

  export function focus() {
    editor?.commands.focus()
  }
</script>

<div bind:this={element}></div>
```

## 快捷键处理

### Shift+Enter 关闭编辑器

```typescript
onKeyDown: ({ event }) => {
  if (event.shiftKey && event.key === 'Enter') {
    dispatch('close')
    return true
  }
  return false
}
```

## 依赖包 (deno install / package.json)

```json
{
  "dependencies": {
    "@tiptap/core": "^2.11.5",
    "@tiptap/pm": "^2.11.5",
    "@tiptap/starter-kit": "^2.11.5",
    "@tiptap/extension-collaboration": "^2.11.5",
    "y-prosemirror": "^1.2.12"
  }
}
```

## 资源清理

```typescript
onDestroy(() => {
  editor?.destroy()
  // nodeDoc 由 TaskProxy 管理生命周期
})
```

## 已知约束

1. **npm 包**: TipTap 系列包通过 npm 安装，兼容现有 package.json
2. **独立 Y.Doc**: 每个 Task 有独立 Y.Doc，新数据结构无需旧兼容
3. **SSR 问题**: TipTap 需要 DOM 环境，NoteEditor 组件需在客户端渲染