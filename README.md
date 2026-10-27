# Traceable

> 事事可追溯

Traceable 是一个桌面日程管理应用。核心理念是"事事可追溯"——任务可以无限嵌套、双向关联，并与日历日程紧密链接，让每一件事的来龙去脉都清晰可查。

## 核心概念

应用围绕三个核心实体构建，所有数据基于 Yjs（CRDT）管理，支持离线使用与多设备实时同步。

| 概念        | 说明                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| **Task**    | 无限嵌套的大纲条目，支持双向链接（一个任务可出现在多个父任务下），可关联富文本笔记 |
| **Event**   | 日历上的时间块，与 Task 多对一关联，表示计划在某个时间段处理某任务                 |
| **Journal** | 按周/日组织的 Task 容器，本质是 Task + 时间/类型元数据                             |

> 数据模型、Yjs 文档结构、响应式桥接等细节见 [apps/desktop/src/lib/states/meta/README.md](apps/desktop/src/lib/states/meta/README.md)
>
> Yjs 初始化与数据同步（IndexedDB + Liveblocks）见 [apps/desktop/src/lib/states/yjs/README.md](apps/desktop/src/lib/states/yjs/README.md)

## 逻辑架构

应用自上而下分为三层：**页面 → 面板 → 组件**。

```
App.svelte
  ├── InteractionContext（通过 Svelte Context API 注入）
  ├── Router
  └── 页面（routes/）
        ├── 分栏布局（PaneGroup）
        └── 面板（panels/）
              └── 组件（components/）
```

### InteractionContext 注入

`App.svelte` 在启动时创建 `InteractionContext` 并通过 Svelte Context API 注入到组件树：

```ts
const interaction = new InteractionContext();
setInteractionContext(interaction);
```

面板控制器在构造时通过 `getInteractionContext()` 获取，供 Todo 控制器的各 Action 处理器使用（拖拽、焦点、光标恢复、滚动记忆、键盘快捷键）。

> 交互服务详情见 [apps/desktop/src/lib/interaction/README.md](apps/desktop/src/lib/interaction/README.md)

### 页面 → 面板 → 组件

| 层级                      | 职责                   | 示例                                                                    |
| ------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| **页面**（`routes/`）     | 分栏组合面板           | `TracePage` = 日历 + Todo 编辑器                                        |
| **面板**（`panels/`）     | 管理面板级状态与控制器 | `Editor` → `EditorPanelController` → `TodoController`                   |
| **组件**（`components/`） | 渲染与交互             | `TodoView` → `TodoList` → `TodoItem`；`Calendar` → `Week` → `WeekEvent` |

页面通过 `PaneGroup` / `Pane` / `PaneResizer` 实现可调整大小的分栏布局：

| 路由        | 左面板 | 右面板      |
| ----------- | ------ | ----------- |
| `/trace`    | 日历   | Todo 编辑器 |
| `/organize` | 周日志 | Todo 编辑器 |
| `/schedule` | 日历   | 周日志      |
| `/settings` | —      | 设置        |

面板控制器（`PanelController`）是面板与组件之间的桥梁，管理导航路径（面包屑缩放）和 `TodoController` 的生命周期。

> Todo 控制器架构详情见 [apps/desktop/src/lib/components/todolist/README.md](apps/desktop/src/lib/components/todolist/README.md)
