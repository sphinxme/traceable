# Todo 大纲组件

无限嵌套的大纲编辑器，采用 Controller 模式管理复杂交互。

## 目录结构

```
todolist/
├── Todo.svelte              # 单个 Todo 条目（含标题编辑）
├── TodoList.svelte          # 子列表容器
├── TodoView.svelte          # 视图入口（标题 + 列表）
├── types.ts
├── controller/              # 控制器层
│   ├── TodoController.svelte.ts       # 主控制器
│   ├── TodoKeyboardActions.svelte.ts  # 键盘操作
│   ├── TodoTransitionActions.svelte.ts# 缩放过渡
│   ├── TodoFocusActions.svelte.ts     # 焦点操作
│   ├── TodoChildrenActions.svelte.ts  # 子任务操作
│   ├── DragDropActions.svelte.ts      # 拖放操作
│   ├── ILifeCycle.svelte.ts           # 生命周期接口
│   ├── IPanelController.svelte.ts     # 面板控制器接口
│   ├── eventbus.ts                    # 全局事件总线（mitt）
│   └── utils.ts                       # ViewId 生成等工具
├── dnd/
│   └── TaskDropable.svelte            # 拖放目标
└── item/
    ├── TodoItem.svelte                # 条目渲染
    ├── event/EventIndicator.svelte    # 事件指示器
    ├── note/NoteEditor.svelte         # 笔记编辑器（Tiptap）
    └── overlay/                       # 叠加层（折叠按钮、拖拽手柄）
```

## TodoController

与每个 Todo 实例一一对应，是交互的核心枢纽。

```
TodoController
  ├── task: Task                    关联的数据实体
  ├── panel: PanelController        所属面板
  ├── viewId: string                唯一视图标识
  ├── statesTree: StateStore        折叠状态
  ├── parentController?: TodoController
  ├── childrenControllers: Map<string, TodoController>
  └── *Actions                      各类操作处理器
```

**生命周期**：实现 `TodoLifeCycle` 接口（`onTodoReady` / `destroy`），在组件 mount 后调用 `onTodoReady` 初始化各 Action，destroy 时清理。

**层级判断**：`isRoot()`（面板根）、`isTopItem()`（第一层）、`isSubItem()`（第二层及以下）。

**缩放导航**：`zoomInto()` 将当前 Task 推入面板导航路径，触发 View Transition 动画。

## ViewId

每个 TodoController 拥有唯一的 `viewId`，由 `panelId` + 父 `viewId` 哈希 + `taskId` 组合而成（`utils.ts` 中的 `makeViewId`）。用于：

- 滚动位置记忆（`ScrollMemoryService` 按 viewId 存储）
- 光标恢复（缩放过渡后按 viewId 恢复）
- 事件总线中的视图标识

## EventBus

基于 `mitt` 的全局事件总线（`controller/eventbus.ts`），用于跨组件通信：

| 事件 | 载荷 | 说明 |
|------|------|------|
| `zoomout:beforeStart` | `{ homeNextViewId }` | 缩放退出过渡开始前 |
| `zoomout:afterTransitioned` | `{ homeNextViewId }` | 缩放退出过渡完成后 |
| `zoominto:afterTransitioned` | `{ zoomingViewId, futureHomeViewId }` | 缩放进入过渡完成后 |
| `drag:start` / `drag:end` | `{ originPanelId, originViewId, task }` | 拖拽开始/结束 |
| `clickOnWeekEvent` | `{ event, task, clickCount }` | 点击日历事件 |
| `highlight` | `{ viewId }` | 高亮指定视图 |

`eventbus$listen(event, handler)` 在 `$effect` 中注册监听，自动清理。

## 面板控制器接口

`PanelController`（`IPanelController.svelte.ts`）定义了面板需实现的能力：

```ts
interface PanelController {
    readonly id: string;
    readonly interaction: InteractionContext;
    zoomable(): boolean;
    pushPaths(childPaths: Task[]): void;
}
```

实现见 `src/lib/panels/PanelController.svelte.ts` 中的 `EditorPanelController`。
