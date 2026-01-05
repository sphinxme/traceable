# Quickstart: TipTap Editor 替换

**Date**: 2026-01-05
**Feature**: 002-tiptap-editor

## 安装依赖

```bash
deno install npm:@tiptap/core@^2.11.5
deno install npm:@tiptap/pm@^2.11.5
deno install npm:@tiptap/starter-kit@^2.11.5
deno install npm:@tiptap/extension-collaboration@^2.11.5
deno install npm:y-prosemirror@^1.2.12
```

## 开发指南

### 1. 创建 NoteEditor 组件

```svelte
<!-- src/lib/components/todolist/NoteEditor.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import StarterKit from '@tiptap/starter-kit'
  import Collaboration from '@tiptap/extension-collaboration'

  let { task, onClose } = $props<{
    task: TaskProxy
    onClose?: () => void
  }>()

  let element = $state<HTMLElement>()
  let editor = $state<Editor | null>(null)

  onMount(() => {
    editor = new Editor({
      element: element!,
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
        editor = editor
      },
      onKeyDown: ({ event }) => {
        if (event.shiftKey && event.key === 'Enter') {
          onClose?.()
          return true
        }
        return false
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

<div bind:this={element} class="note-editor"></div>

<style>
  .note-editor {
    min-height: 200px;
    padding: 1rem;
  }
</style>
```

### 2. TaskProxy 初始化时创建 nodeDoc

```typescript
// src/lib/states/task.svelte.ts
import * as Y from 'yjs'

class TaskProxy {
  readonly nodeDoc: Y.Doc

  constructor(id: string, yMap: Y.Map<unknown>) {
    // ...

    // 初始化时同步创建 nodeDoc
    this.nodeDoc = new Y.Doc()
    // 绑定到 y-indexeddb
    this.yMap.set("noteDoc", this.nodeDoc)
  }

  destroy() {
    this.nodeDoc.destroy()
    // ... 其他清理
  }
}
```