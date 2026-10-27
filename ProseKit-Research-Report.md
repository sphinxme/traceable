# ProseKit 替换 TipTap 调研报告

> 调研时间：2026-07-18
> 调研目标：评估 ProseKit 替换当前 NoteEditor 中 TipTap 方案的可行性与收益

---

## 1. ProseKit 项目概况

| 项目 | 信息 |
|------|------|
| GitHub | [prosekit/prosekit](https://github.com/prosekit/prosekit) |
| Stars | 1.1k |
| 协议 | MIT |
| npm 包名 | `prosekit` |
| 当前版本 | v0.22.0-beta.21 |
| 定位 | 基于 ProseMirror 的 headless 富文本编辑器框架 |
| 官网 | [prosekit.dev](https://prosekit.dev) |
| 支持框架 | React、Vue、Preact、**Svelte**、Solid、Vanilla JS |
| 语言构成 | TypeScript 85%、Svelte 4.4%、Vue 4.3% |

ProseKit 是一个框架无关的 headless 富文本编辑器工具包，底层基于 ProseMirror，通过子路径导出（如 `prosekit/svelte`）为各框架提供一等支持。

---

## 2. Svelte 支持详情

ProseKit 通过 `prosekit/svelte` 子路径为 Svelte 5 提供一等支持：

### 2.1 核心 API

| 功能 | API | 说明 |
|------|-----|------|
| Provider | `<ProseKit {editor}>` | 不渲染 DOM，仅为子组件提供上下文 |
| 编辑器挂载 | `{@attach editor.mount}` | Svelte 5 新语法，将编辑器挂载到 DOM |
| 获取编辑器 | `useEditor()` | 返回 Svelte `Readable` store，`$editor` 响应式访问 |
| 派生值 | `useEditorDerivedValue()` | 编辑器状态变化时自动重新计算 |
| 扩展绑定 | `useExtension` | 绑定扩展到组件生命周期 |
| 快捷键 | `useKeymap` | 声明式键盘快捷键绑定 |
| 文档变更 | `useDocChange` | 监听文档变化 |
| 状态更新 | `useStateUpdate` | 监听编辑器状态更新 |
| 自定义 Node View | `defineSvelteNodeView()` | 用 Svelte 组件渲染自定义节点 |
| 自定义 Mark View | `defineSvelteMarkView()` | 用 Svelte 组件渲染自定义标记 |

### 2.2 Svelte UI 组件

ProseKit 为 Svelte 提供了完整的 UI 组件集：

| 组件 | 路径 | 功能 |
|------|------|------|
| InlinePopover | `prosekit/svelte/inline-popover` | 浮动工具栏（选中文本时出现） |
| Autocomplete | `prosekit/svelte/autocomplete` | 自动补全菜单（Slash Menu、Mention Menu 的基础） |
| BlockHandle | `prosekit/svelte/block-handle` | 块级拖拽手柄 |
| DropIndicator | `prosekit/svelte/drop-indicator` | 拖放指示线 |
| Resizable | `prosekit/svelte/resizable` | 节点拖拽缩放（图片等） |
| Menu | `prosekit/svelte/menu` | 通用菜单 |
| Popover | `prosekit/svelte/popover` | 通用弹出层 |
| Tooltip | `prosekit/svelte/tooltip` | 提示信息 |
| TableHandle | `prosekit/svelte/table-handle` | 表格行列手柄 |

### 2.3 最小 Svelte 5 示例

```svelte
<script lang="ts">
import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'
import { defineBasicExtension } from 'prosekit/basic'
import { createEditor } from 'prosekit/core'
import { ProseKit } from 'prosekit/svelte'

const extension = defineBasicExtension()
const editor = createEditor({ extension })
</script>

<ProseKit {editor}>
  <div {@attach editor.mount} class="editor"></div>
</ProseKit>
```

---

## 3. 当前项目 TipTap 实现分析

### 3.1 技术栈

| 项目 | 版本/信息 |
|------|----------|
| Svelte | `^5.36.13`（Svelte 5） |
| TypeScript | `~5.6.2` |
| @tiptap/core | `^3.14.0` |
| @tiptap/pm | `^3.14.0` |
| @tiptap/extension-bubble-menu | `^3.20.1` |
| @tiptap/extension-collaboration | `^3.14.0` |
| @tiptap/extension-file-handler | `^3.20.1` |
| @tiptap/extension-image | `^3.20.1` |
| @tiptap/starter-kit | `^3.14.0` |
| yjs | `^13.6.29` |
| y-prosemirror | `^1.3.7` |
| @floating-ui/dom | `^1.7.6` |

### 3.2 现有代码清单

NoteEditor 场景共涉及 **10 个文件，约 800 行代码**：

| 文件 | 行数 | 职责 |
|------|------|------|
| `tiptap.svelte` | 197 | 编辑器初始化、Yjs 绑定、图片上传调度 |
| `custom-bubble-menu/CustomBubbleMenu.svelte` | 179 | **手写浮动菜单**：位置计算、显隐逻辑、focus/blur 处理 |
| `custom-bubble-menu/positioning.ts` | 172 | **手写 @floating-ui 集成**：虚拟元素、computePosition、middleware |
| `custom-bubble-menu/plugin.ts` | 83 | **手写 ProseMirror Plugin**：BubbleMenu PluginView |
| `custom-bubble-menu/index.ts` | 7 | 导出 |
| `BubbleMenuToolbar.svelte` | 95 | 工具栏按钮 + 状态同步（手动 `editor.on/off`） |
| `image-node/CustomImage.ts` | 111 | **手写 NodeView**：mount/unmount Svelte 组件，手动管理生命周期 |
| `image-node/ImageNodeView.svelte` | 170 | 图片展示 + 拖拽缩放 |
| `image-node/uploadImage.ts` | 45 | 图片上传逻辑（Tauri HTTP） |
| `image-node/imageUploadState.svelte.ts` | 9 | 上传状态管理 |
| `NoteEditor.svelte` | 46 | 组装层 |
| **合计** | **~800** | |

### 3.3 核心痛点

1. **浮动菜单（BubbleMenu）需要从 ProseMirror 底层手写**：3 个文件、434 行代码，手动集成 `@floating-ui/dom`，手写 ProseMirror Plugin，手动管理 focus/blur/显隐/位置更新。TipTap 官方的 `@tiptap/extension-bubble-menu` 不支持 Svelte 5，无法使用。
2. **自定义 NodeView 需要手动管理 Svelte 组件生命周期**：`mount/unmount/update/selectNode/deselectNode/destroy` 全部手写，与 Svelte 5 组件模型不匹配。
3. **Notion 风格功能全部需要自建**：Slash Menu、Block Handle、Drop Indicator 等块编辑器核心功能，TipTap 均无内置 Svelte 支持。
4. **状态同步繁琐**：必须手动 `editor.on("transaction", handler)` / `editor.off("transaction", handler)`，在 Svelte 5 的 `$effect` 中容易遗漏清理。

---

## 4. 功能逐项对比

### 4.1 浮动工具栏（Inline Menu / Bubble Menu）

| 维度 | 当前 TipTap 手写 | ProseKit |
|------|-----------------|----------|
| 代码量 | 3 文件，434 行 | ~30 行（1 文件） |
| 定位 | 手写 `@floating-ui/dom` 集成 + 虚拟元素 + middleware | 内置 `InlinePopoverRoot/Positioner/Popup`，内部已集成 floating-ui |
| 显隐逻辑 | 手写 `view.composing`、`selection.empty`、`focus/blur` 守卫 | 内置，自动跟踪选区变化切换显隐 |
| 状态同步 | 手动 `editor.on("transaction", ...)` / `editor.off(...)` | `useEditorDerivedValue()` 自动派生响应式状态 |
| 按钮 enabled/pressed | 手动检查 `editor.isActive()` | `editor.commands.toggleBold.canExec()` / `editor.marks.bold.isActive()` |
| 位置更新 | 手动监听 resize/scroll 事件，debounce + `computePosition` | 内置自动处理 |

### 4.2 自定义 NodeView（图片）

| 维度 | 当前 TipTap 手写 | ProseKit |
|------|-----------------|----------|
| 注册方式 | 手写 `mount/unmount` + `update/selectNode/deselectNode/destroy` 全部生命周期 | `defineSvelteNodeView({ name, component })` 一行搞定 |
| 组件通信 | 手写 `instance.updateNode()` / `instance.setSelected()` 挂载到组件实例 | 自动通过 props 传入 `node`, `selected`, `setAttrs`, `getPos` |
| 拖拽缩放 | 手写 `mousedown/move/up` + `editor.chain().updateAttributes()` (~50 行) | 内置 `prosekit/svelte/resizable` 组件 |
| 类型安全 | `any` 类型（`node: any`） | 完整 TypeScript 类型推导 |

### 4.3 Notion 风格块编辑器功能

| 功能 | TipTap | ProseKit |
|------|--------|----------|
| `/` 斜杠命令菜单 | 无内置，需自建 | `AutocompleteRoot/Popup/Item` 原生支持 |
| `@` 提及菜单 | 无内置，需自建 | 同上，更换 regex 即可 |
| `#` 标签菜单 | 无内置，需自建 | 同上 |
| 块拖拽手柄 | 无内置，需自建 | `prosekit/svelte/block-handle` |
| 块拖放指示线 | 无内置，需自建 | `prosekit/svelte/drop-indicator` |
| 图片 Resize | 手写 170 行 | `prosekit/svelte/resizable` |
| 表格行列手柄 | 无 | `prosekit/svelte/table-handle` |
| Tooltip | 无 | `prosekit/svelte/tooltip` |
| Placeholder | `Extension.create` 自定义 | `definePlaceholder()` |
| 文件拖放/粘贴 | `@tiptap/extension-file-handler` | `defineFile()` + 内建 `uploadImage` command |

### 4.4 Yjs 协作

| 维度 | TipTap | ProseKit |
|------|--------|----------|
| 扩展 | `@tiptap/extension-collaboration` | `defineYjs({ doc, awareness })` |
| 底层 | `y-prosemirror` | `y-prosemirror`（相同） |
| 数据格式 | `Y.XmlFragment` | `Y.XmlFragment`（相同） |
| 迁移成本 | — | **零**，Yjs 文档格式兼容 |

### 4.5 扩展体系

| 能力 | TipTap | ProseKit |
|------|--------|----------|
| 基础格式 | `StarterKit` | `defineBasicExtension()` |
| 定义扩展 | `Extension.create({ ... })` | `defineXxx()` 声明式函数 |
| 组合扩展 | 数组 `[ext1, ext2]` | `union([ext1, ext2])` |
| 类型安全 | 需手动声明 `Commands` 接口 | 自动推导 `EditorExtension` 类型 |
| 内置扩展数量 | ~30+ 官方扩展 | ~40+ 内置扩展（bold/italic/code/heading/list/table/image/link/math/mention/...） |
| ProseMirror 访问 | `@tiptap/pm/*` | `prosekit/pm/*` |

---

## 5. 与当前项目兼容性评估

| 维度 | 评估 | 说明 |
|------|------|------|
| Svelte 5 | ✅ 完全兼容 | ProseKit 使用 `{@attach}`、`Readable` store 等 Svelte 5 API |
| TypeScript 5.6 | ✅ 完全兼容 | ProseKit 完整 TypeScript，类型推导优于 TipTap |
| Yjs | ✅ 数据格式兼容 | 均基于 `y-prosemirror` + `Y.XmlFragment`，文档无需转换 |
| Deno 包管理 | ✅ 可行 | 标准 npm 包，`deno add npm:prosekit` |
| Tauri | ✅ 无冲突 | 纯前端库 |
| Tailwind CSS | ✅ 一致 | ProseKit UI 组件基于 Tailwind，与项目一致 |
| shadcn/ui | ✅ 支持 | `npx shadcn@latest add @prosekit/svelte-example-full` |
| `@floating-ui/dom` | ✅ 内置替代 | ProseKit 内部已集成，可移除显式依赖 |
| `@tiptap/*` 全部依赖 | 🔄 可移除 | 替换后不再需要 `@tiptap/core`、`@tiptap/pm` 等 |
| `y-prosemirror` | ✅ 保留 | ProseKit Yjs 扩展同样依赖此包 |

---

## 6. 代码量预估

### 6.1 替换后代码量

| 模块 | 当前 TipTap | ProseKit 替换后 | 缩减比例 |
|------|------------|----------------|----------|
| 浮动工具栏 | ~434 行（3 文件） | ~30 行（1 文件） | **-93%** |
| 图片 NodeView + Resize | ~281 行（2 文件） | ~80 行（1 文件） | **-72%** |
| 上传逻辑 | ~54 行（2 文件） | ~54 行（2 文件，复用） | 0% |
| 编辑器组装 | ~46 行 | ~40 行 | **-13%** |
| **合计** | **~800 行** | **~150 行** | **-81%** |

### 6.2 未来新增 Notion 风格功能

| 新增功能 | TipTap 预估工作量 | ProseKit 预估工作量 |
|----------|-----------------|-------------------|
| Slash Menu (`/`) | ~200 行（自建浮层+键盘导航+过滤） | ~50 行（内置 Autocomplete 组件） |
| 块拖拽手柄 | ~150 行 | ~30 行（内置 BlockHandle 组件） |
| 拖放指示线 | ~100 行 | ~20 行（内置 DropIndicator 组件） |
| 提及菜单 (`@`) | ~200 行 | ~50 行（Autocomplete 换 regex） |

---

## 7. 风险与注意事项

### 7.1 版本风险

| 风险 | 等级 | 说明 |
|------|------|------|
| Beta 版本 | 🟡 中 | 当前 v0.22.0-beta.21，API 可能有变动。但作者 ocavue 活跃维护，1.5k+ commits，更新频繁 |
| 社区规模 | 🟡 中 | 1.1k stars vs TipTap 的 30k+ stars，社区资源较少 |
| Svelte 5 适配 | 🟢 低 | ProseKit 是目前唯一原生支持 Svelte 5 的 ProseMirror 封装，`{@attach}` 语法已是 Svelte 5 标准用法 |

### 7.2 迁移注意事项

1. **TipTap 扩展 API 不兼容**：`Extension.create()` → `defineXxx()`，需重写扩展定义。但 ProseKit 内置扩展更丰富，大概率不需要自定义扩展。
2. **上传逻辑可复用**：`uploadImage.ts`（Tauri HTTP + S3 预签名 URL）是纯业务代码，迁移时直接复用。
3. **Quill 编辑器不受影响**：本调研仅涉及 NoteEditor 的 TipTap 替换，Quill 标题编辑器不在范围内。
4. **`@tiptap/*` 可清理**：替换后可移除 `@tiptap/core`、`@tiptap/pm`、`@tiptap/starter-kit`、`@tiptap/extension-*` 全部依赖。
5. **`@floating-ui/dom` 可清理**：ProseKit 内置浮动定位，不再需要显式依赖。
6. **ProseMirror 可直接访问**：通过 `prosekit/pm/state`、`prosekit/pm/view` 等路径访问 ProseMirror 模块，与 TipTap 的 `@tiptap/pm/*` 用法一致。

---

## 8. 结论与建议

### 8.1 结论

ProseKit 对当前 NoteEditor 场景有显著优势：

1. **浮动工具栏代码量减少 93%** — 这是最直接的收益，ProseKit 内置了 `InlinePopover` 全套定位/显隐逻辑，彻底消除手动集成 `@floating-ui` 和 ProseMirror Plugin 的工作。
2. **NodeView 代码量减少 72%** — `defineSvelteNodeView` 自动管理 Svelte 组件生命周期，不再需要手写 `mount/unmount` 回调。
3. **Notion 块编辑器所需组件全覆盖** — Slash Menu、Block Handle、Drop Indicator、Resizable 都是现成的 Svelte 组件，未来扩展成本极低。
4. **原生 Svelte 5 体验** — `{@attach editor.mount}`、`useEditor()` 返回 `Readable` store、`$editor.commands.xxx` 直接调用，与 Svelte 5 runes 完美契合。
5. **Yjs 集成对等** — `defineYjs()` 底层同样用 `y-prosemirror`，数据格式兼容，迁移后 Yjs 文档不需要转换。
6. **整体代码量减少约 81%** — 从 ~800 行降至 ~150 行，后续维护成本大幅降低。

### 8.2 建议

**建议替换**。ProseKit 在 Svelte 5 一等支持、headless 设计、Notion 风格组件覆盖、代码精简度四个维度均优于当前 TipTap 手写方案。Beta 版本的风险可控——核心 API 已趋于稳定，且 TipTap 对 Svelte 5 的不友好本身就是推动替换的强力理由。

建议迁移步骤：
1. `deno add npm:prosekit` 安装 ProseKit
2. 用 ProseKit 重写 `NoteEditor.svelte`，使用 `defineBasicExtension()` + `defineYjs()` + `InlinePopover`
3. 图片 NodeView 用 `defineSvelteNodeView` + `Resizable` 重写
4. 复用 `uploadImage.ts` 和 `imageUploadState.svelte.ts`
5. 验证 Yjs 数据兼容性
6. 清理 `@tiptap/*` 和 `@floating-ui/dom` 依赖
