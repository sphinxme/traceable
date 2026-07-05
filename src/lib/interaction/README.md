# 交互服务层

通过 Svelte Context API 在应用根注入的交互服务集合。

## 文件

| 文件 | 说明 |
|------|------|
| `context.svelte.ts` | `InteractionContext` 定义与 Context API 注入 |
| `services/DragService.svelte.ts` | 拖拽 |
| `services/TaskFocusService.svelte.ts` | Week→Todo 焦点定位（点击 Week Event → 搜索 DAG → 展开/滚动/高亮 Todo） |
| `services/EventHighlightService.svelte.ts` | Todo→Week 事件高亮（悬停/点击 EventIndicator → 高亮/滚动 EventSegment） |
| `services/CursorRestorationService.svelte.ts` | 光标恢复（缩放过渡后） |
| `services/ScrollMemoryService.svelte.ts` | 滚动位置记忆 |
| `services/KeyboardService.svelte.ts` | 键盘快捷键 |

## 使用方式

在 `App.svelte` 中创建并注入：

```ts
const interaction = new InteractionContext();
setInteractionContext(interaction);
```

在任意子组件中获取：

```ts
const interaction = getInteractionContext();
interaction.drag.start(...);
```

## 服务说明

| 服务 | 职责 |
|------|------|
| `DragService` | 管理拖拽状态，协调跨面板拖放 |
| `TaskFocusService` | 点击 Week Event → 搜索 DAG 定位 Todo → 展开/滚动/高亮 |
| `EventHighlightService` | 悬停/点击 Todo EventIndicator → 高亮/滚动 Week EventSegment |
| `CursorRestorationService` | 在缩放过渡（View Transition）后恢复光标位置 |
| `ScrollMemoryService` | 记忆各面板的滚动位置，切换时恢复 |
| `KeyboardService` | 全局键盘快捷键 |
