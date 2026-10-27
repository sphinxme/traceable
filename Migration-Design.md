# ProseKit 替换 TipTap — 详细分析与迁移方案

> 设计时间：2026-07-19
> 基于调研报告 `ProseKit-Research-Report.md` 与多轮访谈确认

---

## 一、访谈决策汇总

| 维度 | 决策 |
|------|------|
| Yjs 数据兼容 | 无历史数据，无需兼容 |
| Yjs 配置方式 | 修改 NoteEditor 接口，显式接收 `doc: Y.Doc` + `fragment: Y.XmlFragment`，与 `defineYjs` 参数 1:1 对应 |
| Awareness 来源 | 在 NoteEditor 内部 `new Awareness(doc)` 创建独立实例（不连接 Liveblocks，当前不支持协作光标） |
| Shift+Enter | 保持关闭编辑器行为（用 `withPriority` 覆盖 ProseKit 默认 hard break） |
| 图片上传 | 用 ProseKit 内置 `defineImageUploadHandler` + blob URL 预览 |
| 上传错误处理 | 简化处理，用 ProseKit 默认 `console.error`，不做特殊 UI |
| 图片选中工具栏 | 不做特殊处理，按 ProseKit 默认行为 |
| 图片缩放 | 用 ProseKit `Resizable` 组件，交互可调整 |
| 编辑器样式 | 用 `prosekit/basic/style.css` + `typography.css` |
| 撤销重做 | 启用 ProseKit defineYjs 内置的 undo/redo |
| 扩展配置 | `defineBasicExtension()` 全套基础扩展 |
| 组件 API | 用 ProseKit 惯用方式（`useEditor` + `bind:this` 暴露 focus） |
| `@floating-ui/dom` | 保留（`popover-tooltip-content.svelte` 仍需使用） |
| Beta 风险 | 接受，锁定具体版本 |
| 文件组织 | 合并到 `todolist/item/note/` 目录 |
| 迁移策略 | 按功能分阶段（核心 → BubbleMenu → 图片 → 清理） |
| 测试 | 仅手动测试 |
| 未来计划 | 计划添加块编辑器功能（Slash Menu、Block Handle、Drop Indicator） |

---

## 二、调研发现的关键技术细节

### 2.1 Yjs 数据架构

项目使用**单一中央 Y.Doc**（在 `App.svelte` 中通过 `newYDoc()` 创建），所有任务的 `noteDoc`（`Y.XmlFragment`）都存储在这个 Y.Doc 内的 `tasks` Y.Map 中。

关键代码路径：

- **创建**：`src/lib/states/meta/store.svelte.ts:71` — `taskYMap.set("noteDoc", new Y.XmlFragment())`
- **读取**：`src/lib/states/meta/task.svelte.ts:35` — `this.noteDoc = this.yMap.get("noteDoc")`
- **消费**：`src/lib/components/todolist/item/TodoItem.svelte:194` — `<NoteEditor doc={db.doc} fragment={controller.task.noteDoc} />`

**重要发现**：`noteDoc` 是通过 `new Y.XmlFragment()` 直接创建并嵌入 Y.Map 的，**不是**通过 `doc.getXmlFragment('default')` 或 `doc.getXmlFragment('prosemirror')` 获取的。这意味着 ProseKit 的 `defineYjs()` 必须显式传入 fragment 参数，否则会使用错误的 fragment。

**为什么使用 `Y.XmlFragment` 而非子 `Y.Doc`**：`noteDoc` 字段曾考虑改为子 `Y.Doc`（使 ProseKit 可用默认 `doc.getXmlFragment('prosemirror')` 模式），但经分析不可行：

1. **Liveblocks 不支持 Yjs 子文档**。`LiveblocksYjsProvider` 绑定单个 `Y.Doc`，不会自动同步子文档。若用子 `Y.Doc`，每个 noteDoc 需要单独的 provider / room，架构复杂度暴增。
2. **y-indexeddb 同理**，只持久化一个 `Y.Doc`，子文档需要单独的 persistence 实例。
3. **ProseKit 不需要子文档也能正常工作**。`defineYjs({ doc, awareness, fragment })` 支持显式传入 fragment，传入后 `doc` 仅做类型占位，不影响同步。
4. **无需历史数据兼容**，没有"改结构为了兼容旧数据"的动机。

结论：保持现有 `Y.XmlFragment` 结构，配合方案 B（显式传入 `doc` + `fragment`）是最佳选择。

### 2.2 Awareness 现状

项目中**没有任何 Awareness 实例**被创建：

- 所有 `provider.awareness` 引用都被注释掉（`quill.ts:21`、`TodoItem.svelte:124`）
- 没有任何 `new Awareness(...)` 调用
- `y-protocols` 仅作为 `y-prosemirror` 的传递依赖存在（`deno.lock` 中可见 `y-protocols@1.0.6`）

ProseKit 的 `defineYjs()` 要求 `awareness` 为必填参数，因此需要在 NoteEditor 内部创建独立 Awareness。

### 2.3 TipTap 使用范围

TipTap 完全封装在以下位置：

- `src/lib/components/tiptap/` 目录下 10 个文件
- `src/lib/components/todolist/item/note/NoteEditor.svelte:14` — `import { Extension } from "@tiptap/core"`（用于创建 `ShiftEnterClose` 扩展）

项目其他地方没有 TipTap 导入。

### 2.4 `@floating-ui/dom` 共享使用

`@floating-ui/dom` 在两个位置使用：

1. `src/lib/components/tiptap/custom-bubble-menu/positioning.ts:12` — 编辑器浮动菜单
2. `src/lib/components/ui/popover-tooltip/popover-tooltip-content.svelte:9` — 通用弹出层组件（与编辑器无关）

因此替换 TipTap 后**不能完全移除** `@floating-ui/dom`。

### 2.5 ProseKit 内部机制

- **`defineSvelteNodeView`** 基于 `@prosemirror-adapter/svelte`，使用 Svelte 5 的 `mount()` / `unmount()` API
- **`defineYjs`** 底层直接包装 `y-prosemirror` 的 `ySyncPlugin` / `yUndoPlugin` / `yCursorPlugin`，签名 `{ doc: Y.Doc, awareness: Awareness, fragment?: Y.XmlFragment }`，默认 fragment key 为 `'prosemirror'`。传入 `fragment` 后 `doc` 不再用于取默认 fragment，仅做类型占位
- **`InlinePopover`** 在 v0.20.0 拆分为 `InlinePopoverRoot` / `InlinePopoverPositioner` / `InlinePopoverPopup` 三部分
- **`Resizable`** 仅支持像素值（Issue #1444 未解决），当前代码也是像素值，兼容
- **`defineImageUploadHandler`** 用 blob URL 临时预览，上传完成后自动替换为真实 URL，无需手写 uploadId 追踪
- **ImageAttrs** 默认只有 `src` / `width` / `height`，需要 `uploadId` 时用 `defineNodeAttr` 扩展（本方案不使用）
- **`defineHardBreakKeymap`** 默认将 `Shift-Enter` 映射为插入换行，需要用优先级覆盖

---

## 三、发现的潜在坑与应对

### 🔴 高风险

#### 坑 1：Yjs Fragment 不是通过 `doc.getXmlFragment(key)` 获取的

**问题**：当前 `noteDoc` 是通过 `new Y.XmlFragment()` 创建并存储在 `Y.Map` 中的（`store.svelte.ts:71`），不是通过 `doc.getXmlFragment('default')` 或 `doc.getXmlFragment('prosemirror')` 获取的。ProseKit 的 `defineYjs()` 默认使用 `doc.getXmlFragment('prosemirror')`，会创建一个**新的** fragment，而非使用现有的 `noteDoc`。

**应对**：必须显式传入 fragment 参数：
```ts
defineYjs({ doc, awareness, fragment })
```

#### 坑 2：`noteDoc.doc` 可能为 null（已解决）

**问题**：原方案通过 `noteDoc.doc` 反向获取 `Y.Doc`，但 `Y.XmlFragment.doc` 类型为 `Y.Doc | null`，需要运行时断言。

**应对**：采用方案 B，NoteEditor 显式接收 `doc` 和 `fragment` 两个参数，与 `defineYjs` 签名 1:1 对应，彻底消除 `noteDoc.doc` 的 null 检查问题。调用方直接传入 `db.doc`（中央 Y.Doc），语义清晰且类型安全。

#### 坑 3：Shift+Enter 优先级冲突

**问题**：`defineBasicExtension()` 包含 `defineHardBreakKeymap()`，将 Shift+Enter 映射为插入换行。我们的关闭编辑器快捷键需要**覆盖**这个默认行为。ProseKit 用扩展优先级决定快捷键冲突时的胜者。

**应对**：用 `withPriority()` 将自定义 keymap 设为最高优先级：
```ts
import { withPriority, defineKeymap, Priority } from 'prosekit/core'

const shiftEnterClose = withPriority(
  defineKeymap({
    'Shift-Enter': () => { onClose(); return true },
  }),
  Priority.highest,
)
```

#### 坑 4：单一 Y.Doc 上绑定多个编辑器实例的 Awareness 隔离

**问题**：项目使用单一中央 Y.Doc，所有任务的 `noteDoc` 都在其中。每个 NoteEditor 都会 `new Awareness(doc)` 创建独立实例，不连接 Liveblocks，因此不支持协作光标。独立 Awareness 实例之间互不感知，不会产生状态污染。

**应对**：当前设计下 Awareness 仅满足 ProseKit `defineYjs` 的必填参数要求，不用于协作光标。在组件销毁时清理 Awareness：
```ts
onDestroy(() => awareness.destroy())
```
**未来扩展**：如需支持协作光标，可将 Awareness 来源改为 Liveblocks `room.awareness`，此时显式传入 `doc` 的方案 B 让过渡更自然。

### 🟡 中风险

#### 坑 5：ProseKit Beta API 变动

**问题**：v0.22.0-beta.21 的 API 仍在变动。v0.20.0 曾对 InlinePopover 做过破坏性更新（拆分为 Root/Positioner/Popup）。事件处理器从直接传值改为 `CustomEvent` + `event.detail`。

**应对**：
- 锁定具体版本 `prosekit@0.22.0-beta.21`
- 在 `package.json` 中用精确版本号，不用 `^`
- 后续升级时关注 CHANGELOG

#### 坑 6：`useEditorDerivedValue` 性能陷阱

**问题**：调研显示 `useEditorDerivedValue` 的回调函数需要"记忆化"，否则可能导致性能问题。

**应对**：在 Svelte 5 中，`<script>` 顶层定义的函数是稳定的（不会像 React 那样每次渲染重建），所以直接传入内联函数即可：
```ts
const active = useEditorDerivedValue((editor) => ({
  bold: editor.marks.bold.isActive(),
  italic: editor.marks.italic.isActive(),
}))
```

#### 坑 7：ProseMirror 版本冲突（过渡期）

**问题**：TipTap 通过 `@tiptap/pm` 提供 ProseMirror，ProseKit 通过 `prosekit/pm` 提供。在分阶段迁移期间，两者可能同时存在，导致 ProseMirror 实例不匹配（`instanceof` 检查失败）。

**应对**：分阶段迁移期间保持旧代码不引用（注释掉 TodoItem 的旧导入），完成后再删除依赖。或者更安全的做法是**每个阶段完成后立即切换导入**，不让两套代码同时运行。

#### 坑 8：图片上传错误状态 UI 缺失

**问题**：用户选择"简化处理"，但 ProseKit 的 `defineImageUploadHandler` 在上传失败时默认仅 `console.error`，图片会保留 blob URL（`blob:` 链接在页面刷新后失效）。

**应对**：这是可接受的行为。ProseKit 会在组件卸载时自动清理 blob URL。如果后续需要错误 UI，可以通过 `onError` 回调扩展。

### 🟢 低风险

#### 坑 9：`defineBasicExtension()` 包含过多扩展

**问题**：`defineBasicExtension()` 包含 40+ 扩展（含 table、math、mention 等），当前只需要基础格式。可能增加 bundle 体积。

**应对**：ProseKit 的子路径导出设计支持 tree-shaking，实际 bundle 增量可控。且用户计划未来添加块编辑器功能，多扩展是优势。

#### 坑 10：CSS 样式差异

**问题**：从 Tailwind `prose` 类切换到 `prosekit/basic/typography.css`，视觉表现可能不同。

**应对**：迁移后手动对比视觉效果，必要时用自定义 CSS 覆盖。

#### 坑 11：Resizable 仅支持像素值

**问题**：ProseKit 的 `Resizable` 组件不支持百分比宽度（Issue #1444）。当前代码也是用像素值，兼容。

**应对**：无需额外处理。

---

## 四、详细设计

### 4.1 目录结构（合并后）

```
src/lib/components/todolist/item/note/
├── NoteEditor.svelte          # 主组件（合并旧 NoteEditor + tiptap.svelte）
├── BubbleMenuToolbar.svelte    # 浮动工具栏（用 ProseKit InlinePopover）
└── image-node/
    ├── ImageNodeView.svelte    # 图片节点视图（用 defineSvelteNodeView + Resizable）
    └── uploadImage.ts          # 复用（Tauri HTTP + S3 预签名）
```

**删除的目录**：`src/lib/components/tiptap/`（全部 10 个文件）

### 4.2 NoteEditor.svelte 设计

**接口设计说明**：NoteEditor 显式接收 `doc` + `fragment` 两个参数（方案 B），与 `defineYjs` 签名 1:1 对应，消除 `noteDoc.doc` 的 null 检查，且未来接入 Liveblocks Awareness 时过渡更自然。

```svelte
<script lang="ts">
  import 'prosekit/basic/style.css'
  import 'prosekit/basic/typography.css'
  import { defineBasicExtension } from 'prosekit/basic'
  import {
    createEditor,
    union,
    withPriority,
    defineKeymap,
    Priority,
  } from 'prosekit/core'
  import { defineYjs } from 'prosekit/extensions/yjs'
  import { defineImageUploadHandler } from 'prosekit/extensions/image'
  import { defineSvelteNodeView, ProseKit } from 'prosekit/svelte'
  import { Awareness } from 'y-protocols/awareness'
  import * as Y from 'yjs'
  import { onDestroy } from 'svelte'

  import BubbleMenuToolbar from './BubbleMenuToolbar.svelte'
  import ImageNodeView from './image-node/ImageNodeView.svelte'
  import { uploadImage } from './image-node/uploadImage'

  interface Props {
    doc: Y.Doc
    fragment: Y.XmlFragment
    onClose: () => void
  }

  let { doc, fragment, onClose }: Props = $props()

  // 创建独立 Awareness（不连接 Liveblocks，当前不支持协作光标）
  const awareness = new Awareness(doc)

  // 覆盖 Shift+Enter 为关闭编辑器（优先级高于 defineBasicExtension 的 hard break）
  const shiftEnterClose = withPriority(
    defineKeymap({
      'Shift-Enter': () => {
        onClose()
        return true
      },
    }),
    Priority.highest,
  )

  // 图片上传 handler（用 blob URL 预览 + 自动替换为真实 URL）
  const imageUploadHandler = defineImageUploadHandler({
    uploader: async ({ file }) => {
      return await uploadImage(file)
    },
  })

  // 自定义图片节点视图
  const imageNodeView = defineSvelteNodeView({
    name: 'image',
    component: ImageNodeView,
  })

  const extension = union([
    defineBasicExtension(),
    defineYjs({ doc, awareness, fragment }),
    shiftEnterClose,
    imageUploadHandler,
    imageNodeView,
  ])

  const editor = createEditor({ extension })

  onDestroy(() => {
    awareness.destroy()
    editor.destroy()
  })

  export function focus() {
    editor.focus()
  }
</script>

<ProseKit {editor}>
  <div {@attach editor.mount} class="min-h-[100px] focus:outline-none"></div>
  <BubbleMenuToolbar />
</ProseKit>
```

### 4.3 BubbleMenuToolbar.svelte 设计

```svelte
<script lang="ts">
  import { useEditor, useEditorDerivedValue } from 'prosekit/svelte'
  import {
    InlinePopoverRoot,
    InlinePopoverPositioner,
    InlinePopoverPopup,
  } from 'prosekit/svelte/inline-popover'
  import Bold from '@lucide/svelte/icons/bold'
  import Italic from '@lucide/svelte/icons/italic'
  import Strikethrough from '@lucide/svelte/icons/strikethrough'
  import Code from '@lucide/svelte/icons/code'

  const editor = useEditor()

  // 响应式派生按钮状态
  const active = useEditorDerivedValue((e) => ({
    bold: e.marks.bold.isActive(),
    italic: e.marks.italic.isActive(),
    strike: e.marks.strike.isActive(),
    code: e.marks.code.isActive(),
  }))

  function preventFocusLoss(e: MouseEvent) {
    e.preventDefault()
  }
</script>

<InlinePopoverRoot>
  <InlinePopoverPositioner placement="top">
    <InlinePopoverPopup>
      <div
        class="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        role="toolbar"
        tabindex="-1"
        onmousedown={preventFocusLoss}
      >
        <button
          type="button"
          title="加粗"
          aria-pressed={$active.bold}
          class="rounded p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground {$active.bold ? 'bg-accent text-accent-foreground' : ''}"
          onclick={() => $editor.commands.toggleBold()}
        >
          <Bold size={16} />
        </button>
        <!-- italic / strike / code 同理 -->
      </div>
    </InlinePopoverPopup>
  </InlinePopoverPositioner>
</InlinePopoverRoot>
```

### 4.4 ImageNodeView.svelte 设计

```svelte
<script lang="ts">
  import type { SvelteNodeViewProps } from 'prosekit/svelte'
  import {
    ResizableRoot,
    ResizableHandle,
  } from 'prosekit/svelte/resizable'

  let { node, selected, setAttrs }: SvelteNodeViewProps = $props()

  let attrs = $derived(node.attrs as {
    src?: string
    width?: number | null
    height?: number | null
  })
  let src = $derived(attrs.src ?? '')
  let width = $derived(attrs.width ?? undefined)
  let height = $derived(attrs.height ?? undefined)
  let aspectRatio = $derived(
    width && height ? width / height : undefined,
  )
</script>

<ResizableRoot
  {width}
  {height}
  {aspectRatio}
  onResizeEnd={(e) => setAttrs(e.detail)}
>
  <img
    {src}
    class="block max-w-full select-none rounded-md transition-shadow duration-200 hover:shadow-md hover:ring-1 hover:ring-border/60 {$selected ? 'shadow-md ring-1 ring-border/60' : ''}"
    draggable="false"
  />
  <ResizableHandle position="bottom-right" />
</ResizableRoot>
```

### 4.5 TodoItem.svelte 改动

NoteEditor 的 props 从 `noteDoc` + `onClose` 改为 `doc` + `fragment` + `onClose`，调用方需相应修改：

```svelte
<!-- 旧 -->
<NoteEditor noteDoc={controller.task.noteDoc} onClose={...} />

<!-- 新 -->
<NoteEditor doc={db.doc} fragment={controller.task.noteDoc} onClose={...} />
```

`db.doc` 已在 `TodoItem.svelte` 的上下文中可用，无需额外导入。

### 4.6 依赖变更

**新增**：
- `npm:prosekit` (锁定 `0.22.0-beta.21`)

**显式添加**（原为传递依赖）：
- `npm:y-protocols` (用于 `Awareness`)

**保留**：
- `yjs`, `y-prosemirror` (ProseKit 依赖)
- `@floating-ui/dom` (`popover-tooltip-content.svelte` 仍用)

**删除**：
- `@tiptap/core`
- `@tiptap/extension-bubble-menu`（实际未使用）
- `@tiptap/extension-collaboration`
- `@tiptap/extension-file-handler`
- `@tiptap/extension-image`
- `@tiptap/pm`
- `@tiptap/starter-kit`

---

## 五、迁移阶段

### Phase 1：核心编辑器 + Yjs

**目标**：用 ProseKit 替换 TipTap 核心编辑器，验证基础编辑和 Yjs 同步。

**步骤**：
1. `deno add npm:prosekit@0.22.0-beta.21 npm:y-protocols`
2. 创建 `src/lib/components/todolist/item/note/BubbleMenuToolbar.svelte`（空占位）
3. 重写 `src/lib/components/todolist/item/note/NoteEditor.svelte`（仅核心编辑器 + defineYjs + Shift+Enter）
4. 验证：基础文本编辑、Yjs 同步（打开两个窗口测试）、Shift+Enter 关闭、focus() 方法

**验收标准**：能在 NoteEditor 中编辑文本，内容通过 Yjs 同步，Shift+Enter 关闭编辑器。

### Phase 2：BubbleMenu

**目标**：用 ProseKit InlinePopover 替换手写浮动菜单。

**步骤**：
1. 实现 `BubbleMenuToolbar.svelte`（InlinePopoverRoot/Positioner/Popup + 4 个按钮）
2. 用 `useEditorDerivedValue` 派生按钮 active 状态
3. 验证：选中文本时工具栏出现、点击按钮执行格式化、按钮状态正确、空选区时隐藏

**验收标准**：选中文本时出现浮动工具栏，bold/italic/strike/code 按钮功能正常。

### Phase 3：图片节点

**目标**：用 ProseKit defineSvelteNodeView + Resizable + defineImageUploadHandler 替换手写图片节点。

**步骤**：
1. 移动 `uploadImage.ts` 到 `todolist/item/note/image-node/`
2. 实现 `image-node/ImageNodeView.svelte`（ResizableRoot + ResizableHandle）
3. 在 NoteEditor 中添加 `defineImageUploadHandler` + `defineSvelteNodeView`
4. 验证：粘贴图片触发上传、拖放上传、缩放手柄、上传后 URL 替换

**验收标准**：粘贴/拖放图片自动上传并显示，可拖拽缩放，上传完成后图片正常显示。

### Phase 4：清理与依赖整理

**目标**：删除旧代码，清理依赖。

**步骤**：
1. 删除 `src/lib/components/tiptap/` 整个目录（10 个文件）
2. 从 `package.json` 删除 `@tiptap/*` 全部依赖
3. 运行 `deno run check` 验证 lint/typecheck
4. 全功能手动测试（见下方测试清单）
5. 提交 commit

**验收标准**：`deno run check` 通过，无 `@tiptap` 导入残留，所有功能正常。

---

## 六、手动测试清单

| 测试项 | 验证点 |
|--------|--------|
| 基础编辑 | 输入文本、换行、删除 |
| Yjs 同步 | 两个窗口编辑同一任务，内容实时同步 |
| Yjs 持久化 | 刷新页面后内容保留（y-indexeddb） |
| Liveblocks 同步 | 两台设备编辑同一任务，内容同步 |
| Shift+Enter | 按下关闭 NoteEditor Popover |
| Bold/Italic/Strike/Code | 选中文本点击按钮，格式生效，按钮高亮 |
| 工具栏显隐 | 选中文本时出现，取消选中时消失 |
| 空选区 | 不显示工具栏 |
| IME 输入 | 中文输入法 composing 时不触发工具栏 |
| 图片粘贴 | 粘贴图片自动上传，显示预览，上传完成替换 URL |
| 图片拖放 | 拖放图片文件自动上传 |
| 图片缩放 | 拖拽手柄缩放图片，松开后尺寸持久化 |
| 编辑器 focus | Popover 打开时自动 focus |
| 撤销重做 | Ctrl+Z / Ctrl+Shift+Z 工作 |
| 组件销毁 | 关闭 Popover 后无内存泄漏、无控制台错误 |

---

## 七、风险矩阵

| 风险 | 等级 | 概率 | 影响 | 应对 |
|------|------|------|------|------|
| Beta API 变动 | 🟡 中 | 中 | 中 | 锁定版本，后续手动升级 |
| ProseMirror 版本冲突（过渡期） | 🟡 中 | 低 | 高 | 每阶段完成立即切换导入 |
| Awareness 状态隔离 | 🟢 低 | 低 | 低 | 独立实例不互感知，onDestroy 清理 |
| defineImageUploadHandler 错误处理不足 | 🟢 低 | 中 | 低 | 可接受，后续按需扩展 |
| InlinePopover 不支持 IME 场景 | 🟢 低 | 低 | 中 | 手动测试验证，必要时自定义 |
| 单一维护者风险 | 🟡 中 | 低 | 高 | 代码在本地，可 fork 维护 |

---

## 八、优缺点对比（迁移后）

### 优点

1. **代码量减少 ~81%**：从 ~800 行降至 ~150 行
2. **消除手写 ProseMirror Plugin**：不再需要手写 BubbleMenu 的 floating-ui 集成
3. **消除手写 NodeView 生命周期管理**：`defineSvelteNodeView` 自动处理
4. **原生 Svelte 5 支持**：`{@attach}`、`useEditor`、`useEditorDerivedValue` 符合 runes 模型
5. **未来扩展成本低**：Slash Menu、Block Handle、Drop Indicator 都是现成组件
6. **图片上传流程简化**：blob URL 预览 + 自动替换，无需手写 uploadId 追踪

### 缺点

1. **Beta 版本风险**：API 可能变动，需锁定版本
2. **社区规模小**：1.1k stars，遇到问题可能找不到社区解答
3. **Awareness 未连接 Liveblocks**：当前方案不支持协作光标（后续可通过将 Awareness 来源改为 `room.awareness` 扩展）
4. **新增依赖**：prosekit + y-protocols（但移除 7 个 @tiptap 包，净减少）
5. **样式可能微调**：从 Tailwind prose 切换到 ProseKit typography.css

---

## 九、待实施时验证的技术细节

以下点需要在实施时通过实际代码验证（无法仅通过调研确认）：

1. **`Priority.highest` 是否存在**：调研确认有 `Priority.high`，但 `highest` 需验证。若无，用 `Priority.high + 1` 或数值。
2. **`defineImageUploadHandler` 的确切导入路径**：可能是 `prosekit/extensions/image` 或 `prosekit/extensions/file`。
3. **`SvelteNodeViewProps` 的导出位置**：可能是 `prosekit/svelte` 或 `@prosemirror-adapter/svelte`。
4. **`ResizableRoot` 的 `onResizeEnd` 事件 detail 格式**：确认是 `{width, height}`。
5. **`InlinePopoverRoot` 是否自动处理 IME composing**：需手动测试。
6. **`defineBasicExtension()` 是否包含 `defineImage()`**：若包含，只需添加 node view；若不包含，需单独添加。
7. **`useEditor` 返回的是 `Readable<Editor>` 还是 `Editor`**：影响 `$editor` 还是 `editor` 的访问方式。
8. **`editor.commands.toggleBold()` 是否需要 `.run()` 调用**：ProseKit 与 TipTap 的命令调用方式可能不同。

---

## 十、总结

方案整体可行，主要风险集中在 **Beta API 稳定性**和 **Shift+Enter 优先级覆盖**两点，均有明确应对策略。Yjs 数据层兼容性良好（底层同为 y-prosemirror），图片上传流程可大幅简化。建议按 4 阶段逐步迁移，每阶段完成后手动验证。
