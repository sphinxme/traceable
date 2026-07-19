# ProseKit 迁移实施记录

> 开始时间：2026-07-19

---

## 一、已确认的 API 细节

| # | 问题 | 结论 | 来源 |
|---|------|------|------|
| 1 | `Priority.highest` 是否存在 | **存在**，值为 4 | `@prosekit/core/dist/editor.d.ts:172-178` |
| 2 | `defineImageUploadHandler` 导入路径 | `prosekit/extensions/image` | `@prosekit/extensions/dist/image.d.ts:143` |
| 3 | `SvelteNodeViewProps` 导出位置 | `prosekit/svelte`（继承 `NodeViewContext`） | `@prosekit/svelte/dist/build/extensions/svelte-node-view.d.ts:5-6` |
| 4 | `onResizeEnd` detail 格式 | `{width: number, height: number}` | `@prosekit/web/dist/resizable.d.ts:43-49` |
| 5 | InlinePopover 自动处理 IME | **不处理** | `@prosekit/web/dist/inline-popover.js:167-198` |
| 6 | `defineBasicExtension()` 含 `defineImage()` | **包含** | `@prosekit/basic/dist/index.d.ts:11,25` |
| 7 | `useEditor` 返回类型 | `Readable<Editor>`（Svelte store） | `@prosekit/svelte/dist/build/hooks/use-editor.d.ts:14` |
| 8 | `toggleBold()` 调用方式 | 直接调用返回 `boolean`，不需要 `.run()` | `@prosekit/core/dist/editor.d.ts:95-106` |

---

## 二、实施决策

### 2.1 NoteEditor 接口

```typescript
interface Props {
  doc: Y.Doc
  fragment: Y.XmlFragment
  onClose: () => void
}
```

- 显式传 `doc` + `fragment`（原方案 B），与 `defineYjs` 签名 1:1 对应
- 调用方 `TodoItem.svelte` 需 `import { db } from '@/state'`，传 `db.doc`
- 不使用 Svelte context（db 是全局模块单例，但选择显式传递以保持接口清晰）

### 2.2暴露给外部的 API

- **直接暴露 `editor`**（不再用 `bind:this` + `export function focus()`）
- 调用方通过 `noteEditor.focus()` → 改为需要时直接访问 editor 实例

### 2.3编辑器样式

- 使用 `prosekit/basic/style.css` + `prosekit/basic/typography.css`
- mount div 保留 `min-h-[100px] focus:outline-none`
- 不再使用 Tailwind `prose prose-sm` 类

### 2.4图片上传

- 用 `defineImageUploadHandler` + blob URL 预览 + `uploadImage.ts` 复用
- **删除 `imageUploadState.svelte.ts`**，不做上传进度/错误 UI
- `defineBasicExtension()` 已含 image 扩展，只需 `defineSvelteNodeView` + `defineImageUploadHandler`

### 2.5 BubbleMenuToolbar

- `$editor` 访问 editor（Svelte store 解包）
- 命令调用：`$editor.commands.toggleBold()`（直接调用，不 `.run()`）
- active 状态：`useEditorDerivedValue`

### 2.6db.doc 来源

`db` 是全局模块单例（`src/state.ts`），通过 `import { db } from '@/state'` 获取。

---

## 三、已知风险与待验证项

### 3.1 IME composing 问题（待手动测试）

`InlinePopoverRoot` 不处理 IME composing。中文输入法 composing 时选区变化可能触发工具栏意外弹出。需要在 Phase 2 手动测试验证。若确有问题，需自行添加 composing 守卫。

---

## 四、实施进度

### Phase 1：核心编辑器 + Yjs ✅

- [x] 创建 `BubbleMenuToolbar.svelte`（空占位）
- [x] 重写 `NoteEditor.svelte`（核心编辑器 + defineYjs + Shift+Enter）
- [x] 修改 `TodoItem.svelte`（传入 doc + fragment）
- [ ] 手动验证：基础文本编辑、Yjs 同步、Shift+Enter 关闭、focus

### Phase 2：BubbleMenu ✅

- [x] 实现 `BubbleMenuToolbar.svelte`（InlinePopover + 4 按钮）
- [x] 用 `useEditorDerivedValue` 派生按钮状态
- [ ] 手动验证：选中文本时工具栏出现/消失、按钮功能、IME

### Phase 3：图片节点 ✅

- [x] 移动 `uploadImage.ts` 到 `todolist/item/note/image-node/`
- [x] 实现 `ImageNodeView.svelte`（ResizableRoot + ResizableHandle）
- [x] 在 NoteEditor 中添加 `defineImageUploadHandler` + `defineSvelteNodeView`
- [ ] 手动验证：粘贴/拖放图片、缩放、URL 替换

### Phase 4：清理与依赖整理 ✅

- [x] 删除 `src/lib/components/tiptap/` 整个目录（10 个文件）
- [x] 从 `package.json` 删除 `@tiptap/*` 全部依赖（7 个包）+ `y-prosemirror`
- [x] 运行 `deno run check` 验证 lint/typecheck（0 errors, 0 warnings）
- [ ] 全功能手动测试
