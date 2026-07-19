# Todo Handle Overlay 动效改造方案

## 目标

1. 当前item遮罩动画：`scaleX(0→1)` 从左往右 → `scale(0→1)` 从左上到右下，预留曲线配置
2. 同ID其他item遮罩动画：淡入淡出
3. 按下瞬间（mousedown）即通知同ID item显示遮罩（不再等 drag:start）
4. 所有序列退出均使用 fadeOut
5. Handle 按住时外层浅色圆环消失
6. 遮罩颜色调淡
7. 父容器 opacity-35 保留但加过渡

---

## 改动文件

| 文件 | 改动 |
|------|------|
| `controller/eventbus.svelte.ts` | 新增 `press:start` / `press:end` 事件 |
| `Todo.svelte` | 状态拆分 + 事件时序 + 双遮罩渲染 + Svelte transitions + 颜色 + 父容器过渡 |
| `overlay/Handle.svelte` | 新增 `onmouseup` prop + `:active .plate` 隐藏 |

---

## 1. eventbus.svelte.ts — 新增事件类型

在 `Events` 类型中增加：

```ts
'press:start': { task: Task };
'press:end': { task: Task };
```

与 `drag:start`/`drag:end` 平行，payload 更简洁（只需 task）。

---

## 2. Todo.svelte — 核心改动

### 2.1 事件时序

**当前流程：**
| 事件 | 行为 |
|------|------|
| onmousedown | `$isMeDragging = true` |
| ondragstart | `startDrag()` → emit `drag:start` |
| ondragend | `endDrag()` → emit `drag:end` |

**改后流程：**
| 事件 | 行为 |
|------|------|
| onmousedown | `$isMeDragging = true` + emit `press:start` |
| onmouseup | `$isMeDragging = false` + emit `press:end`（处理点击不拖的情况） |
| ondragstart | `startDrag()` → emit `drag:start`（不变） |
| ondragend | `endDrag()` + emit `press:end`（处理拖拽结束的情况） |

> click 和 drag 互斥：标准HTML5拖拽中 mouseup 不会在 dragstart 后在源元素触发，所以不会 double-emit `press:end`。即使 double-emit，接收端幂等（设 false 两次无副作用）。

### 2.2 状态拆分

```ts
// 之前
let sameTaskIdOtherTaskDragging = $state(false);
// 监听 drag:start / drag:end

let meDragging = $derived(
    controller.dragDropActions.$isMeDragging || sameTaskIdOtherTaskDragging,
);

// 改后
let isOtherSameIdPressing = $state(false);
// 监听 press:start / press:end

let isMePressing = $derived(controller.dragDropActions.$isMeDragging);
let meDragging = $derived(isMePressing || isOtherSameIdPressing);
```

`meDragging` 仍用于父容器 `opacity-35` 和隐藏 CollapseIcon。

### 2.3 遮罩渲染 — 条件分支 + Svelte transitions

```svelte
<script>
import { scale, fade } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

// 遮罩动画曲线 — 后续可替换 easing 函数
const overlayEasing = cubicOut;
const overlayDuration = 150;
</script>

{#if isMePressing}
  <!-- 当前item：从左上到右下 scale 进入，fadeOut 退出 -->
  <div
    class="overlay-current absolute -ml-2 z-50 h-full w-full rounded-md bg-zinc-300 pointer-events-none opacity-25"
    style:transform-origin="top left"
    in:scale={{ duration: overlayDuration, start: 0, easing: overlayEasing }}
    in:fade={{ duration: overlayDuration }}
    out:fade={{ duration: overlayDuration }}
  ></div>
{:else if isOtherSameIdPressing}
  <!-- 同ID其他item：纯 fade 淡入淡出 -->
  <div
    class="overlay-other absolute -ml-2 z-50 h-full w-full rounded-md bg-zinc-300 pointer-events-none opacity-25"
    in:fade={{ duration: overlayDuration }}
    out:fade={{ duration: overlayDuration }}
  ></div>
{/if}
```

**关键设计点：**
- `opacity-25`（Tailwind）设为目标透明度，`fade` transition 从 0↔0.25 动画
- `transform-origin: top left` + `scale` transition 实现从左上到右下
- `out:fade` 统一退出动画
- `overlayEasing` 变量集中管理，后续调曲线只改这里
- `bg-zinc-300` 替代 `bg-zinc-500`，颜色大幅调淡

### 2.4 父容器过渡

```svelte
<!-- 之前 -->
<div class=" relative flex flex-col ${meDragging ? '  opacity-35 ' : ''}">

<!-- 改后 -->
<div class="relative flex flex-col transition-opacity duration-150" class:opacity-35={meDragging}>
```

### 2.5 Handle 事件绑定改动

```svelte
<Handle
    onmousedown={(event) => {
        if (event.button === 0) {
            controller.dragDropActions.$isMeDragging = true;
            eventbus.emit('press:start', { task: controller.task });
        }
    }}
    onmouseup={(event) => {
        if (event.button === 0) {
            controller.dragDropActions.$isMeDragging = false;
            eventbus.emit('press:end', { task: controller.task });
        }
    }}
    ondragstart={(event) => {
        controller.dragDropActions.startDrag();
    }}
    ondragend={(event) => {
        event.preventDefault();
        controller.dragDropActions.endDrag();
        eventbus.emit('press:end', { task: controller.task });
    }}
    taskId={controller.task.id}
    onclick={() => controller.zoomInto()}
/>
```

### 2.6 清除旧代码

- 删除旧 `{#if meDragging}` 遮罩 block（:165-172）
- 删除旧 `@keyframes fadeIn` 和 `.dragging` CSS 规则（:176-191）
- 删除 `sameTaskIdOtherTaskDragging` 及其 `drag:start`/`drag:end` 监听（:56-79）

---

## 3. Handle.svelte — 按住时圆环消失

### 3.1 新增 onmouseup prop

```ts
interface Props {
    taskId: string;
    status?: "TODO" | "BLOCK" | "DONE";
    onclick: MouseEventHandler<HTMLDivElement>;
    ondragstart: MouseEventHandler<HTMLDivElement>;
    ondragend: MouseEventHandler<HTMLDivElement>;
    onmousedown: MouseEventHandler<HTMLDivElement>;
    onmouseup: MouseEventHandler<HTMLDivElement>;  // 新增
}
```

解构新增 `onmouseup`，绑定到根 div。

### 3.2 CSS 规则

```css
.handle:active .plate {
    opacity: 0 !important;
}
```

---

## 4. 事件流验证

### 点击（zoomInto）场景

```
mousedown → $isMeDragging=true, emit press:start
  → 当前item: scale+fade 进入
  → 其他同id: fade 进入
mouseup → $isMeDragging=false, emit press:end
  → 所有item: fadeOut 退出
click → zoomInto() → 当前item unmount
```

### 拖拽场景

```
mousedown → $isMeDragging=true, emit press:start
  → 当前item: scale+fade 进入
  → 其他同id: fade 进入
dragstart → startDrag() → emit drag:start
  （其他逻辑不变）
dragend → endDrag(), emit press:end
  → 所有item: fadeOut 退出
  → $isMeDragging=false
```

### 按下后取消（无拖拽、无点击导航）

```
mousedown → $isMeDragging=true, emit press:start
  → overlay 进入
mouseup → $isMeDragging=false, emit press:end
  → overlay fadeOut 退出
（组件保持mounted）
```

---

## 5. 颜色对照

| | 旧 | 新 |
|--|------|------|
| 遮罩背景 | `bg-zinc-500` | `bg-zinc-300` |
| 遮罩目标opacity | `0.3` | `0.25` |
| 实际视觉效果 | 深灰半透明，偏重 | 浅灰轻透明，柔和 |

---

## 6. 不变的部分

- Handle 的 `plate` hover 行为（`group-hover:opacity-60`）不变
- Handle 的 `extra-panel` 行为不变（已注释的展开面板）
- `drag:start` / `drag:end` 事件及其在 DragDropActions 中的逻辑不变
- ContextMenu 行为不变
- CollapseIcon 隐藏逻辑（`!meDragging && hasChildren`）不变
- highlight-box 闪烁动画不变
