# Todo 大纲组件

无限嵌套的大纲编辑器，采用 Controller 模式管理复杂交互。

## 架构概览

控制器树与组件树同构——每个 `TodoView`（面板根）或 `Todo`（子条目）实例对应一个 `TodoController`，控制器持有全部业务逻辑，组件只负责渲染和委托。

交互逻辑拆分到 5 个 Action 处理器（均实现 `TodoLifeCycle`）：

| Action | 职责 |
|--------|------|
| `TodoKeyboardActions` | 键盘导航（↑↓）、缩进（Tab/Shift+Tab）、新建（Enter，4种case）、笔记开关（Shift+Enter） |
| `TodoTransitionActions` | View Transition 动画命名与协调（缩放进入/退出、Tab移动） |
| `TodoFocusActions` | 光标恢复（键盘导航/新建后）+ Week→Todo 高亮（滚动+金色闪烁） |
| `TodoChildrenActions` | 子任务索引与兄弟节点查询 |
| `DragDropActions` | 拖放 reparenting（move/link），含 DAG 环检测 |

## 关键概念

### ViewId

每个 `TodoController` 拥有唯一的 `viewId`，由 `panelId` + 父 `viewId` 哈希 + `taskId` 组合而成。贯穿滚动记忆、光标恢复、View Transition 命名、DAG 路径查找等全部子系统。

### 双事件总线

| 总线 | 范围 | 用途 |
|------|------|------|
| `eventbus`（`controller/eventbus.svelte.ts`） | todolist 内部 | 缩放过渡（`zoomout:*` / `zoominto:*`）、拖拽（`drag:start` / `drag:end`） |
| `interactionBus`（`interaction/eventbus.svelte.ts`） | 全局交互 | Week→Todo 焦点（`focus:todo`）、Todo→Week 高亮（`focus:eventSegment`） |

两者分离以避免反向依赖（interaction/services → todolist/controller）。

### 面板控制器

`TodoController` 通过 `PanelController` 接口访问面板能力（`id`、`interaction`、`zoomable()`、`pushPaths()`），实现见 `EditorPanelController`。

### 缩放导航

`zoomInto()` 将当前 Task 路径推入面板导航栈，触发 `document.startViewTransition` 动画；`EditorPanelController` 的 `$effect.pre` 销毁旧控制器树并创建新树。

### 拖放语义

- **move**：从原 parent 移除后添加到新 parent（同 panel 默认）
- **link**：保留原 parent，添加到新 parent（跨 panel 默认，实现双向关联）
- 拖到自己/子孙节点 → 拒绝；`willCreateCycle` 防止 DAG 成环
