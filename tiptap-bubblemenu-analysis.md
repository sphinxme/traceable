# TipTap BubbleMenu 显隐逻辑与交互流程分析报告

> 分析对象:`src/lib/components/todolist/item/note/NoteEditor.svelte` 中作为备注编辑器使用的 TipTap 实例
> 依赖版本:`@tiptap/extension-bubble-menu@3.20.1`
> 涉及文件:
> - `src/lib/components/todolist/item/note/NoteEditor.svelte`
> - `src/lib/components/tiptap/tiptap.svelte`
> - `src/lib/components/tiptap/BubbleMenuToolbar.svelte`
> - `node_modules/.deno/@tiptap+extension-bubble-menu@3.20.1/.../dist/index.js`

---

## 1. 概述

当前项目在 `NoteEditor.svelte` 中复用了一个通用 TipTap 封装组件 `tiptap.svelte`。该封装的扩展列表里挂载了 `@tiptap/extension-bubble-menu`,选中文字时会浮出一个格式工具栏(`BubbleMenuToolbar.svelte`),提供加粗/斜体/删除线/行内代码四种 mark 切换。

由于项目**未传自定义 `shouldShow`**,BubbleMenu 的所有显隐判定都走扩展包的默认实现。本报告梳理:元素与扩展绑定关系、显隐判定的四条 AND 条件、各事件源的触发链、`show()/hide()/updatePosition()` 的 DOM 与样式行为、工具栏的焦点保护策略,并给出完整交互流程示例与若干注意事项。

---

## 2. 文件结构与职责

| 文件 | 职责 |
|---|---|
| `NoteEditor.svelte` | 业务入口。注入 `ShiftEnterClose` 扩展(Shift+Enter 关闭),把 `noteDoc` 传入 `TipTap` |
| `tiptap.svelte` | TipTap 编辑器封装。装配 StarterKit / Collaboration / CustomImage / FileHandler / BubbleMenu,管理 editor 生命周期 |
| `BubbleMenuToolbar.svelte` | BubbleMenu 内部的工具栏 UI。监听 editor 事件,维护四个 mark 的高亮状态 |
| `extension-bubble-menu/dist/index.js` | 扩展本体。`BubbleMenu` Extension + `BubbleMenuPlugin`(PM Plugin) + `BubbleMenuView`(PluginView)三级 |

```
NoteEditor.svelte
   └─ TipTap (tiptap.svelte)
        ├─ Editable DOM (bind:this={element})
        ├─ bubbleMenuElement (bind:this={bubbleMenuElement})
        │     └─ BubbleMenuToolbar.svelte
        └─ extensions: [StarterKit, Collaboration, CustomImage, FileHandler, BubbleMenu, ShiftEnterClose]
```

---

## 3. 元素与扩展绑定

### 3.1 宿主元素(`tiptap.svelte:180-187`)

```svelte
<div style="position: relative" class="app">
  <div bind:this={bubbleMenuElement} class="invisible">
    {#if editorState.editor}
      <BubbleMenuToolbar editor={editorState.editor} />
    {/if}
  </div>
  <div bind:this={element}></div>
</div>
```

- `bubbleMenuElement` 是工具栏的宿主 div,作为 `BubbleMenu.configure({ element })` 传入。
- 外层 `.app` 设 `position: relative`,成为 Floating UI `strategy: "absolute"` 的 offsetParent,位置基准由此确定。
- 初始 `class="invisible"`(Tailwind ⇒ `visibility: hidden`)只是 editor 实例化前的兜底;真正控制可见性的是 `BubbleMenuView` 在 `show()/hide()` 里写入的**行内 style**,行内样式优先级高于 class,因此这个 class 在首次 `show()` 之后实际失效,可视为历史包袱。

### 3.2 扩展配置(`tiptap.svelte:141-150`)

```ts
BubbleMenu.configure({
  element: bubbleMenuElement,
  updateDelay: 0,
  options: {
    placement: "top",
    offset: 8,
    flip: true,
    shift: true,
  },
})
```

| 项 | 取值 | 含义 |
|---|---|---|
| `element` | `bubbleMenuElement` | 工具栏 DOM |
| `updateDelay` | `0` | 跳过 debounce,每次 transaction 立即评估 shouldShow |
| `shouldShow` | **未传** | 走扩展默认实现(见第 4 节) |
| `options.placement` | `top` | 显示在选区上方 |
| `options.offset` | `8` | 与选区距离 8px |
| `options.flip` / `shift` | `true` | 上方空间不足时翻转;避免溢出视口 |
| `options.hide`(Floating UI middleware) | **未启用** | 选区滚出视口时不会自动隐藏菜单 |

### 3.3 `NoteEditor` 的额外注入(`NoteEditor.svelte:14-24`)

```ts
const ShiftEnterClose = Extension.create({
  name: "shiftEnterClose",
  addKeyboardShortcuts() {
    return { "Shift-Enter": () => { onClose(); return true; } };
  },
});
```

与 BubbleMenu 无直接耦合,只是额外挂在同一个 editor 上的快捷键扩展。

---

## 4. 显隐判定:`shouldShow` 默认实现

源码:`extension-bubble-menu/dist/index.js:62-72`

```js
this.shouldShow = ({ view, state, from, to }) => {
  const { doc, selection } = state;
  const { empty } = selection;
  const isEmptyTextBlock = !doc.textBetween(from, to).length
    && isTextSelection(state.selection);
  const isChildOfMenu = this.element.contains(document.activeElement);
  const hasEditorFocus = view.hasFocus() || isChildOfMenu;
  if (!hasEditorFocus || empty || isEmptyTextBlock || !this.editor.isEditable) {
    return false;
  }
  return true;
};
```

菜单显示需**同时**满足以下四个条件(任一不满足 → `hide()`):

| 条件 | 含义 | 失败场景示例 |
|---|---|---|
| `hasEditorFocus` | 编辑器持焦 **或** 焦点在 `bubbleMenuElement` 内 | 点击工具栏按钮瞬间(此时编辑器 blur、焦点尚未确认是否在菜单内) |
| `!empty` | 选区非空(`from !== to`) | 光标为单点 / 无选区 |
| `!isEmptyTextBlock` | 选区内确实有文字 | 选中空行、纯空白 |
| `editor.isEditable` | 编辑器可编辑 | 只读模式 |

`isChildOfMenu` 这一项很关键:它让"点击工具栏按钮"场景下即使编辑器临时失焦,只要焦点落进 `bubbleMenuElement`,菜单仍按"持焦"处理,不会被误关。

---

## 5. 显隐触发链(事件源)

`BubbleMenuView` 构造函数(`:30-184`)注册了多个事件源,任一触发都会重新评估或直接改变可见状态:

| 触发源 | 注册位置 | 行为 |
|---|---|---|
| PM plugin view 的 `update(view, oldState)` | `:296-306` | 每次 transaction 都被调。`updateDelay===0` 时跳过 debounce 直接走 `updateHandler`。若 `composing`(IME 录入中)或 selection/doc 均未变 → return;否则 `getShouldShow()` 决定 `hide()` 或 `updatePosition()+show()` |
| `editor.on("focus")` | `:92-94` | `setTimeout(() => this.update(editor.view))` 异步重评估 |
| `editor.on("blur")` | `:95-112` | 见 5.1 分支表 |
| `view.dom` `dragstart` | `:76-78` | 立即 `hide()`,避免拖拽时菜单悬空 |
| `bubbleMenuElement` `mousedown`(capture) | `:73-75, 172` | 设 `preventHide = true`,挡住紧随的编辑器 blur |
| `window resize` / `scrollTarget scroll` | `:84-91` | 60ms debounce 后**仅**调 `updatePosition()`,不重评估 shouldShow |
| `editor.on("transaction")` 的 meta 路径 | `:146-153` | 程序化 API:`tr.setMeta("bubbleMenu","updatePosition")` 或 `{type:"updateOptions", options}`。项目未使用 |

### 5.1 `blurHandler` 分支(`:95-112`)

```js
this.blurHandler = ({ event }) => {
  if (this.editor.isDestroyed) { this.destroy(); return; }
  if (this.preventHide) { this.preventHide = false; return; }
  if (event?.relatedTarget && this.element.parentNode?.contains(event.relatedTarget)) return;
  if (event?.relatedTarget === this.editor.view.dom) return;
  this.hide();
};
```

| 分支 | 行为 |
|---|---|
| 编辑器已销毁 | `destroy()` |
| `preventHide===true` | 清除标记,**不隐藏**(典型场景:刚刚 mousedown 在工具栏上) |
| `relatedTarget` 在 `element.parentNode` 内 | 不隐藏(`element.show()` 时被 append 到 `.app` 内,parentNode 就是 `.app`) |
| `relatedTarget === view.dom` | 不隐藏(仍在编辑器与菜单之间切换) |
| 其他 | `hide()` |

### 5.2 `updateHandler` 流程(`:126-139`)

```
transaction 发生
    │
    ▼
update(view, oldState)              # updateDelay===0 直接进入
    │
    ▼
updateHandler
    │ composing 或 selection/doc 均未变 → return
    ▼
getShouldShow(oldState)
    │ false → hide()
    ▼ true
updatePosition() (Floating UI computePosition) → show()
```

`updateDelay===0` 时跳过 `handleDebouncedUpdate`,避免延迟,选中即显。

---

## 6. 显示/隐藏/定位实现

### 6.1 `show()`(`:325-338`)

```js
show() {
  if (this.isVisible) return;
  this.element.style.visibility = "visible";
  this.element.style.opacity = "1";
  const appendToElement = typeof this.appendTo === "function" ? this.appendTo() : this.appendTo;
  (appendToElement ?? this.view.dom.parentElement)?.appendChild(this.element);
  if (this.floatingUIOptions.onShow) this.floatingUIOptions.onShow();
  this.isVisible = true;
}
```

- 设行内 `visibility:visible; opacity:1`,覆盖初始的 `class="invisible"`。
- 把元素 `appendChild` 进 `appendTo ?? view.dom.parentElement`(本项目未传 `appendTo` → 进 `.app` wrapper)。
- 注意:`appendChild` 会**移动**元素而非复制。元素原本就在 `.app` 内,所以这一步在 DOM 结构上无变化,但确保了它附挂在编辑器父节点下。

### 6.2 `hide()`(`:339-350`)

```js
hide() {
  if (!this.isVisible) return;
  this.element.style.visibility = "hidden";
  this.element.style.opacity = "0";
  this.element.remove();
  if (this.floatingUIOptions.onHide) this.floatingUIOptions.onHide();
  this.isVisible = false;
}
```

- 设行内 `visibility:hidden; opacity:0`。
- **`element.remove()` 把元素从 DOM 树中摘掉**。这一点很重要:隐藏态下 `bubbleMenuElement` 不在 DOM 内,直到下次 `show()` 才被 append 回去。
- 但由于 Svelte 的 `{#if editorState.editor}` 条件块本身在 `.app` 模板里,这个 if 决定的是 `<BubbleMenuToolbar>` 是否渲染;而 `BubbleMenuView` 的 `appendChild/remove` 操作的是同一引用,二者并不冲突——Svelte 渲染的 div 一直存在于 `.app` 下,只是被 BubbleMenu 在 `hide()` 时从 `.app` 内.removeChild。

### 6.3 `updatePosition()`(`:271-295`)

```js
updatePosition() {
  const virtualElement = this.virtualElement;
  if (!virtualElement) return;
  computePosition(virtualElement, this.element, {
    placement: this.floatingUIOptions.placement,
    strategy: this.floatingUIOptions.strategy,
    middleware: this.middlewares,
  }).then(({ x, y, strategy, middlewareData }) => {
    if (middlewareData.hide?.referenceHidden || middlewareData.hide?.escaped) {
      this.element.style.visibility = "hidden";
      return;
    }
    this.element.style.visibility = "visible";
    this.element.style.width = "max-content";
    this.element.style.position = strategy;
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    if (this.isVisible && this.floatingUIOptions.onUpdate) this.floatingUIOptions.onUpdate();
  });
}
```

- `virtualElement`(`:223-270`):对文本选区用 `posToDOMRect(view, from, to)` 算一个 `DOMRect`,包成 `{ getBoundingClientRect, getClientRects }` 给 Floating UI;对 `NodeSelection`/`CellSelection` 有特殊处理(本项目主要走文本选区分支)。
- middleware 顺序在 `get middlewares` (`:185-222`) 中确定:`flip → shift → offset`(只 push 配置为 truthy 的项,本项目三项都启用)。
- `strategy: "absolute"`,坐标相对于 offsetParent(`.app`) 计算。
- 由于未启用 Floating UI 的 `hide` middleware,`middlewareData.hide` 永远为 undefined,选区滚出视口时菜单**不会**自动隐藏,只会跟随选区 rect 平移。

---

## 7. 工具栏交互与焦点保护(`BubbleMenuToolbar.svelte`)

### 7.1 双重焦点保护

工具栏按钮点击会引发"编辑器失焦 → 工具栏获焦"的默认行为,这可能让 `shouldShow` 的 `hasEditorFocus` 变 false 而关菜单。当前实现通过**两层叠加**防止:

1. **PluginView 层**(`:73-75, 172`):
   ```js
   this.mousedownHandler = () => { this.preventHide = true; };
   this.element.addEventListener("mousedown", this.mousedownHandler, { capture: true });
   ```
   `mousedown` 在 capture 阶段触发,先于编辑器 `blur`,设 `preventHide=true`。紧接着的 `blurHandler` 命中第二分支(清除标记不隐藏)。

2. **Toolbar 容器层**(`BubbleMenuToolbar.svelte:39-41, 49`):
   ```ts
   function preventFocusLoss(e: MouseEvent) { e.preventDefault(); }
   // ...
   onmousedown={preventFocusLoss}
   ```
   `preventDefault()` 阻止浏览器把焦点从编辑器转移到按钮——这样 `editor.chain().focus().toggleXxx().run()` 中的 `.focus()` 是冗余但无害,且选区状态完整保留。

两层保护叠加:即使其中一层失效,另一层仍可兜底。

### 7.2 高亮状态同步(`:21-37`)

```ts
$effect(() => {
  const update = () => {
    active = {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
    };
  };
  update();
  editor.on("transaction", update);
  editor.on("selectionUpdate", update);
  return () => {
    editor.off("transaction", update);
    editor.off("selectionUpdate", update);
  };
});
```

- `$effect` 体未读响应式状态,只在挂载/卸载时执行一次,做事件订阅与清理。
- 监听 `transaction` + `selectionUpdate` → 每次编辑器变更重算 `active` → `aria-pressed` 与 `bg-accent` 样式同步高亮。

### 7.3 按钮点击链路

```
click → editor.chain().focus().toggleBold().run()
   │
   ▼ 产生 mark transaction
plugin view update() 触发
   │ selection 未变(doc 变了 mark)→ selectionChanged=false, docChanged=true
   ▼
getShouldShow() → 仍 true(toggle 不改 selection,empty/isEmptyTextBlock 不变)
   │
   ▼
updatePosition() + show()(已在显示态,no-op)
   │
   ▼
toolbar $effect 里的 update 被调用 → active.bold 翻转 → 按钮高亮
```

---

## 8. 完整交互流程示例

### 8.1 选中文字 → 工具栏出现

```
1. 用户拖选文本
2. ProseMirror selection 变化 → 触发 transaction
3. BubbleMenuView.update(view, oldState)
4. selectionChanged=true → 进入 updateHandler
5. composing=false,非 isSame → 调 getShouldShow()
6. hasEditorFocus=true, !empty=true, !isEmptyTextBlock=true, isEditable=true
   → shouldShow=true
7. updatePosition() (Floating UI 计算 x,y)
8. show(): element appendChild 到 .app, visibility:visible
9. BubbleMenuToolbar.svelte $effect 的 update 被调用 → active 状态刷新
```

### 8.2 点击工具栏"加粗"

```
1. mousedown 在 bubbleMenuElement(capture 阶段)→ preventHide=true
2. Toolbar 容器 mousedown → preventDefault()(编辑器不失焦)
3. click → editor.chain().focus().toggleBold().run()
4. mark transaction → BubbleMenuView.update
5. selectionChanged=false, docChanged=true → 进入 updateHandler(非 isSame)
6. getShouldShow → true → updatePosition + show(no-op)
7. toolbar update → active.bold 翻转 → 高亮
```

### 8.3 直接敲字 → 工具栏消失

```
1. 选区有文字时按下字符键
2. ProseMirror 用字符替换选区 → selection 变为 cursor(empty)
3. BubbleMenuView.update → selectionChanged=true, docChanged=true
4. getShouldShow → empty=true → false
5. hide(): visibility:hidden, opacity:0, element.remove()
```

### 8.4 拖拽选区

```
1. dragstart 事件触发 → dragstartHandler → 立即 hide()
2. 即使后续 drag 不发生,菜单也已先关,避免悬空
```

### 8.5 点击工具栏后回到编辑器

```
1. 点击按钮时 preventHide=true
2. 编辑器从未真正 blur(preventDefault)
3. 按钮松开后焦点仍在编辑器 → shouldShow 仍 true
4. 后续任何 transaction 触发 update,菜单保持显示
```

### 8.6 窗口 resize / 滚动

```
1. resize/scroll → resizeHandler
2. 60ms debounce → updatePosition()
3. 仅重新计算坐标,不重评估 shouldShow
4. 菜单跟随选区位置移动
```

---

## 9. 关键点与注意事项

### 9.1 toggle 格式 vs 直接打字

- `Ctrl+B` 等只改 mark,**selection 不变** → shouldShow 仍 true → 菜单不收。
- 选区有文字时按下字符键 → selection 被替换为空 cursor → shouldShow=false → 菜单消失。
- 这就是"选文字后调格式菜单还在,敲字菜单就消失"的成因,符合预期行为。

### 9.2 `editorState` 重赋值(`tiptap.svelte:163-165`)

```ts
onTransaction: ({ editor: e }) => { editorState = { editor: e }; },
```

每次 transaction 都重赋 `editorState`,触发 Svelte 响应。但 `editor` 引用不变,`{#if editorState.editor}` 首次为真后恒为真,**不会重建** `BubbleMenuToolbar`,只做一次 props 比对。该写法主要为了让外部 `bind:this` 与 `focus()` 能拿到最新 editor 引用。

### 9.3 `class="invisible"` 的作用

- 仅在 editor 实例化完成、首次 `show()` 写入行内 `visibility` 之前作为兜底隐藏。
- 之后行内样式始终覆盖该 class,这个 class 实际成为历史包袱,可考虑移除(需保留 editor 创建前的隐藏态另用 `hidden` 或 outer wrapper)。

### 9.4 未启用 Floating UI `hide` middleware

- `options` 中未传 `hide`,所以 `middlewareData.hide` 恒为 undefined。
- 选区滚出视口时菜单**不会**自动隐藏,只会跟随选区 rect 一起平移。
- 若希望"滚出视口即隐藏",可在 `options` 加 `hide: true`。

### 9.5 可外部控制的刷新 API

```ts
// 手动让菜单重定位(布局变化时)
editor.view.dispatch(editor.state.tr.setMeta("bubbleMenu", "updatePosition"));

// 动态改 placement/offset 等
editor.view.dispatch(editor.state.tr.setMeta("bubbleMenu", {
  type: "updateOptions",
  options: { placement: "bottom", offset: 12 },
}));
```

项目目前未使用,但可在 inline 编辑容器尺寸变化时手动刷新菜单位置。

### 9.6 IME 输入态

`updateHandler` 在 `composing===true` 时 return(`:127-131`),即中文输入法组字期间不刷新菜单显隐,避免组合输入时菜单闪烁。

### 9.7 多 BubbleMenu 实例注意

`pluginKey` 默认 `"bubbleMenu"`。若同一 editor 上挂多个 BubbleMenu,需各自传不同 `pluginKey`,且 `setMeta` 的 key 也要对应。

---

## 10. 总结

当前项目的 BubbleMenu 显隐模型可以一句话概括:

> **默认 `shouldShow` 依赖"选区非空 + 选区有文字 + 编辑器持焦 + 可编辑"四条 AND,任何 transaction / focus / blur / dragstart 都会触发一次重评估;显示时元素被 append 到编辑器 wrapper 上并按 Floating UI 计算 absolute 坐标,隐藏时直接 `remove()` 出 DOM。工具栏通过"capture mousedown 设防 + toolbar mousedown preventDefault"双重保险保住编辑器焦点与选区。**

设计上简洁可靠:扩展默认行为已足够覆盖常见交互,项目侧只需配置 element 与 placement,无需自定义 `shouldShow`。值得关注的潜在改进点:
1. 移除冗余的 `class="invisible"`(或替换为更明确的初始隐藏机制)。
2. 如需"滚出视口隐藏",在 `options` 启用 `hide: true`。
3. 当 inline 编辑容器尺寸/布局变化时,可调用 `setMeta("bubbleMenu","updatePosition")` 主动刷新。
