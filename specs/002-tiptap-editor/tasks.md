# Task List: TipTap Editor 替换

**Feature**: 002-tiptap-editor | **Generated**: 2026-01-05 | **Spec**: [spec.md](./spec.md)

## 依赖关系图

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational)
    │
    ├─────────────────────────────────────────────┐
    │                                             │
    ▼                                             ▼
Phase 3 (US1)                              Phase 4 (US2)
编辑器基本功能替换                         Shift+Enter关闭编辑器
    │                                             │
    └──────────────┬──────────────────────────────┘
                   │
                   ▼
              Phase 5 (US3)
              纯文本编辑(已经取消, 请跳过该任务)
                   │
                   ▼
              Phase 6 (US4)
              焦点管理
                   │
                   ▼
            Phase 7 (Polish)
            资源清理 & 完善
```

## 并行执行机会

- **US1 与 US2**: 可以并行开发，因为它们作用于同一个组件但关注点不同（US1关注基本渲染，US2关注快捷键）
- **US3 与 US4**: 在 US1 完成后可以并行进行

## 任务统计

| Phase | User Story | 任务数 |
|-------|------------|--------|
| Phase 1 | Setup | 2 |
| Phase 2 | Foundational | 1 |
| Phase 3 | US1 - 编辑器基本功能替换 | 4 |
| Phase 4 | US2 - Shift+Enter关闭编辑器 | 2 |
| Phase 5 | US3 - 纯文本编辑 | 2 |
| Phase 6 | US4 - 焦点管理 | 1 |
| Phase 7 | Polish | 1 |
| **Total** | | **13** |

---

## Phase 1: Setup

**Goal**: 项目初始化，安装 TipTap 相关依赖

### 独立测试标准
- `deno add` 命令成功执行，无报错

### 任务

- [x] T001 安装 TipTap 核心依赖到 deno.json
  ```bash
  deno add @tiptap/core @tiptap/pm @tiptap/starter-kit
  ```

- [x] T002 安装 Yjs 协作依赖到 deno.json
  ```bash
  deno add y-prosemirror @tiptap/extension-collaboration yjs
  ```

---

## Phase 2: Foundational

**Goal**: 准备 Y.Doc 子文档结构，为编辑器协作奠定基础

### 独立测试标准
- TaskProxy 实体中包含 noteDoc 字段
- noteDoc 创建时正确初始化为 Y.Doc 实例
- TaskProxy 创建时能够正确初始化 noteDoc 字段

### 任务

- [x] T003 [P] 在 TaskData 接口中添加 noteDoc: Y.Doc 字段
  ```typescript
  // specs/002-tiptap-editor/data-model.md
  noteDoc: Y.Doc  // TipTap ProseMirror 文档
  ```

---

## Phase 3: User Story 1 - 编辑器基本功能替换

**Goal**: 替换 Quill 为 TipTap，正确渲染并绑定 Yjs 协作

**Independent Test**: 打开任务备注编辑器，输入文本，验证文本正确保存和显示

**Acceptance Scenarios**:
1. TipTap 正确渲染并可正常输入文本
2. 文本内容正确同步到 Yjs 共享状态
3. 多窗口协作编辑实时同步

### 任务

- [ ] T004 [P] [US1] 创建 NoteEditor.svelte 基础骨架，导入 TipTap 核心类
  ```svelte
  <!-- src/lib/components/todolist/NoteEditor.svelte -->
  <script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Collaboration from '@tiptap/extension-collaboration';
  import * as Y from 'yjs';
  import { yCollab } from 'y-prosemirror';

  let { task, onClose } = $props();
  let element: HTMLElement;
  let editor: Editor | undefined = $state();

  onMount(() => {
    editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({ history: false }), // Yjs 已处理历史
        Collaboration.configure({
          document: task.noteDoc,
        }),
      ],
      onUpdate: ({ editor }) => {
        // 内容已通过 Yjs 自动同步
      },
    });
  });

  onDestroy(() => {
    editor?.destroy();
  });
  </script>

  <div bind:this={element} class="tiptap-editor"></div>
  ```

- [ ] T005 [P] [US1] 实现 TipTap 与 Y.Doc 的协作绑定
  ```typescript
  // NoteEditor.svelte 中添加协作扩展配置
  extensions: [
    StarterKit.configure({
      history: false, // 禁用默认历史，使用 Yjs 历史
    }),
    Collaboration.configure({
      document: task.nodeDoc, // 绑定到 Task 的 Y.Doc
    }),
  ],
  ```

- [ ] T006 [US1] 实现编辑器内容获取方法 (getText, getJSON)
  ```typescript
  // 在 NoteEditor.svelte 中添加导出方法
  function getContent() {
    if (!editor) return '';
    return editor.getText(); // 获取纯文本内容
  }

  function getJSON() {
    if (!editor) return null;
    return editor.getJSON(); // 获取 JSON 格式
  }
  ```

- [ ] T007 [US1] 添加基础样式到编辑器容器
  ```css
  /* src/lib/components/todolist/NoteEditor.svelte */
  <style>
  .tiptap-editor {
    min-height: 200px;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }

  .tiptap-editor:focus {
    outline: none;
    border-color: #3b82f6;
  }
  </style>
  ```

---

## Phase 4: User Story 2 - Shift+Enter 关闭编辑器

**Goal**: 保留 Shift+Enter 快捷键关闭编辑弹窗的行为

**Independent Test**: 在编辑器中按 Shift+Enter，验证弹窗是否正确关闭

**Acceptance Scenarios**:
1. Shift+Enter 关闭编辑弹窗
2. Enter（无 Shift）插入换行符，不关闭弹窗

### 任务

- [ ] T008 [P] [US2] 在 TipTap 中配置键盘快捷键处理
  ```typescript
  // NoteEditor.svelte - 添加 editorProps 处理
  extensions: [
    StarterKit.configure({ history: false }),
    Collaboration.configure({ document: task.noteDoc }),
  ],
  editorProps: {
    handleKeyDown: (view, event) => {
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        onClose?.();
        return true;
      }
      // Enter 无 Shift 时允许默认行为（插入换行）
      return false;
    },
  },
  ```

- [ ] T009 [US2] 移除 Quill 相关键盘事件处理代码
  ```typescript
  // 删除 Quill 的键盘事件监听逻辑
  // 确认 TipTap 的 handleKeyDown 正确处理关闭行为
  ```


## Phase 6: User Story 4 - 焦点管理

**Goal**: 导出 focus 方法，支持编程式聚焦

**Independent Test**: 调用 editor.focus() 方法，验证编辑器是否获得焦点

**Acceptance Scenarios**:
1. 调用 focus 方法后，编辑器获得输入焦点

### 任务

- [ ] T012 [US4] 实现 focus 导出方法
  ```typescript
  // NoteEditor.svelte
  function focus() {
    editor?.commands.focus();
  }

  // 暴露给父组件
  export { focus };
  ```

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: 资源清理，防止内存泄漏

### 任务

- [ ] T013 确保 onDestroy 中正确清理 TipTap 编辑器和 Yjs 绑定
  ```typescript
  onDestroy(() => {
    if (editor) {
      editor.destroy();
      editor = undefined;
    }
  });
  ```

---

## 实现策略总结

### MVP 范围

**MVP**: Phase 1 + Phase 2 + Phase 3 (US1)

仅实现基本功能：
- TipTap 编辑器正确渲染
- Yjs 协作绑定
- 基础纯文本输入

### 增量交付

1. **第一轮**: US1 基本功能替换完成即可验证核心价值
2. **第二轮**: US2 Shift+Enter 和 US3 纯文本编辑
3. **第三轮**: US4 焦点管理
4. **最终**: 资源清理和完善

### 风险点

1. **Y.Doc 生命周期**: 确保 Task 删除时正确销毁 Y.Doc
2. **协作冲突**: 依赖 Yjs 自动解决，不处理复杂冲突场景
3. **性能**: 编辑器加载时间目标 <1s

---

## 参考资料

### TipTap API (from Context7)

**获取内容方法**:
- `editor.getText()` - 获取纯文本，可配置 blockSeparator
- `editor.getJSON()` - 获取 ProseMirror JSON 结构
- `editor.getHTML()` - 获取 HTML 字符串
- `editor.getMarkdown()` - 获取 Markdown 格式

**设置内容方法**:
- `editor.commands.setContent(content, { contentType: 'json' | 'html' | 'markdown', emitUpdate: true })`

**焦点方法**:
- `editor.commands.focus()` - 聚焦编辑器